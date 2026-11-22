import "server-only";
// Regras de negócio da geração com IA: valida, calcula o preço em créditos
// (sempre no servidor), debita, envia ao provedor (Kie.ai ou fal.ai) e acompanha até concluir.
// Se a IA falhar, os créditos voltam automaticamente.
import { z } from "zod";
import { aiProviders, env, isAiConfigured } from "./config";
import { buildStagingPrompt, buildVideoPrompt, CAMERA_MOVES, VISUAL_STYLES, STAGING_STYLES } from "./creative";
import { falErrorMessage, jobResult, jobStatus, simulateStaging, simulateVideo, submitJob } from "./fal";
import { invalidateKieBalance, isKieNoBalance, KIE_CREDITS_PER_USD, kieBalance, KieError, kieCreateTask, kieGetTask } from "./kie";
import { getVideoModel, pickStagingModel, STAGING_MODELS, type Provider } from "./models";
import { stagingCredits, videoCostUsd, videoCredits, type PricingParams } from "./pricing";
import { store, type Generation } from "./store";

export const serverPricing: PricingParams = {
  usdToBrl: env.usdToBrl,
  markup: env.markup,
  creditValueBrl: env.creditValueBrl,
};

const httpUrl = z.string().refine((u) => /^https?:\/\//.test(u) || u.startsWith("/api/demo-media/"), "URL inválida");

export const videoRequestSchema = z.object({
  mode: z.enum(["animate", "staging", "transition"]),
  startImageUrl: httpUrl,
  endImageUrl: httpUrl.optional().nullable(),
  prompt: z.string().max(800).optional().default(""),
  cameraId: z.string().refine((id) => CAMERA_MOVES.some((c) => c.id === id)),
  styleId: z.string().refine((id) => VISUAL_STYLES.some((s) => s.id === id)),
  modelId: z.string(),
  duration: z.number().int(),
  audio: z.boolean(),
  versions: z.number().int().min(1).max(4),
});

export const stagingRequestSchema = z.object({
  imageUrl: httpUrl,
  room: z.string().max(60),
  styleId: z.string().refine((id) => STAGING_STYLES.some((s) => s.id === id)),
  notes: z.string().max(500).optional().default(""),
  variations: z.number().int().min(1).max(3).default(1),
});

export class GenerationError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

function absolute(url: string) {
  // O fal precisa de URL pública. No modo demo os arquivos são locais (não sobem para a IA).
  return url.startsWith("/") ? new URL(url, env.appUrl).toString() : url;
}

function providerOf(g: { model_id: string; kind: string }): Provider {
  if (g.kind === "staging") return STAGING_MODELS.find((m) => m.id === g.model_id)?.provider ?? "fal";
  return getVideoModel(g.model_id)?.provider ?? "fal";
}

/** Envia ao provedor. Sem nenhuma chave de IA, simula (modo demonstração). */
async function submitToProvider(provider: Provider, endpoint: string, input: Record<string, unknown>) {
  if (!isAiConfigured) return `demo-${crypto.randomUUID()}`;
  if (provider === "kie") return kieCreateTask(endpoint, input);
  return (await submitJob(endpoint, input)).requestId;
}

const AI_UNAVAILABLE = "Geração temporariamente indisponível. Seus créditos não foram usados. Tente novamente em alguns minutos.";

/** Antes de cobrar o cliente, confere se a conta do Kie tem saldo para o pedido. */
async function ensureKieBalance(usdNeeded: number) {
  try {
    const credits = await kieBalance();
    if (credits < usdNeeded * KIE_CREDITS_PER_USD) {
      console.error(`[ALERTA] Saldo do Kie.ai insuficiente: ${credits} créditos Kie (precisa de ~${Math.ceil(usdNeeded * KIE_CREDITS_PER_USD)}). Recarregue em kie.ai.`);
      throw new GenerationError("AI_UNAVAILABLE", AI_UNAVAILABLE, 503);
    }
  } catch (e) {
    if (e instanceof GenerationError) throw e;
    // se a consulta de saldo falhar, segue (o envio trata a falta de saldo)
    console.error("[kieBalance]", (e as Error).message);
  }
}

function errorMessage(e: unknown) {
  if (isKieNoBalance(e)) {
    invalidateKieBalance();
    console.error("[ALERTA] Kie.ai sem saldo:", (e as Error).message);
    return AI_UNAVAILABLE;
  }
  if (e instanceof KieError) return e.message;
  return falErrorMessage(e);
}

async function chargeAndSubmit(rows: Omit<Generation, "id" | "created_at" | "completed_at" | "status" | "fal_request_id" | "output_url" | "error">[], totalCost: number, description: string, userId: string) {
  const ref = crypto.randomUUID();
  await store.spendCredits(userId, totalCost, description, ref);
  const created: Generation[] = [];
  for (const row of rows) {
    const g = await store.createGeneration(row);
    try {
      const requestId = await submitToProvider(providerOf(row), row.endpoint, row.input);
      await store.updateGeneration(g.id, { fal_request_id: requestId, status: "processing" });
      created.push({ ...g, fal_request_id: requestId, status: "processing" });
    } catch (e) {
      const msg = errorMessage(e);
      console.error("[submit]", row.endpoint, msg);
      if (await store.transitionGeneration(g.id, ["queued", "processing"], { status: "failed", error: msg, completed_at: new Date().toISOString() })) {
        await store.addCredits(userId, row.credits_cost, "refund", "Reembolso: falha ao iniciar geração", g.id);
      }
      created.push({ ...g, status: "failed", error: msg });
    }
  }
  return created;
}

export async function createVideoGenerations(userId: string, body: unknown) {
  const req = videoRequestSchema.parse(body);
  const model = getVideoModel(req.modelId);
  if (!model) throw new GenerationError("BAD_MODEL", "Modelo não encontrado");
  if (isAiConfigured && !aiProviders[model.provider]) throw new GenerationError("BAD_MODEL", "Este modelo não está disponível no momento");
  if (!model.durations.includes(req.duration)) throw new GenerationError("BAD_DURATION", "Duração não suportada por este modelo");
  if (req.mode !== "animate" && !req.endImageUrl) throw new GenerationError("NEED_END", "Este modo precisa do último quadro");
  if (req.endImageUrl && !model.supportsEndFrame) throw new GenerationError("NO_END", "Este modelo não aceita último quadro");

  const audio = req.audio && model.supportsAudio;
  const perVideo = videoCredits(model, req.duration, audio, serverPricing);
  if (isAiConfigured && model.provider === "kie") await ensureKieBalance(videoCostUsd(model, req.duration, audio) * req.versions);
  const prompt = buildVideoPrompt({ mode: req.mode, cameraId: req.cameraId, styleId: req.styleId, userPrompt: req.prompt });

  const input: Record<string, unknown> = {
    prompt,
    [model.fields.start]: model.fields.startIsArray ? [absolute(req.startImageUrl)] : absolute(req.startImageUrl),
    [model.fields.duration]: model.fields.durationAsString ? String(req.duration) : req.duration,
    ...(model.fields.extra ?? {}),
  };
  if (req.endImageUrl && model.fields.end) input[model.fields.end] = absolute(req.endImageUrl);
  if (model.fields.audio && model.supportsAudio) input[model.fields.audio] = audio;

  const rows = Array.from({ length: req.versions }, () => ({
    user_id: userId,
    kind: "video" as const,
    mode: req.mode,
    model_id: model.id,
    endpoint: model.endpoint,
    prompt: req.prompt || null,
    params: { cameraId: req.cameraId, styleId: req.styleId, duration: req.duration, audio, startImageUrl: req.startImageUrl, endImageUrl: req.endImageUrl ?? null },
    input,
    thumbnail_url: req.startImageUrl,
    credits_cost: perVideo,
  }));
  return chargeAndSubmit(rows, perVideo * req.versions, `${model.name} · ${req.duration}s × ${req.versions}`, userId);
}

export async function createStagingGenerations(userId: string, body: unknown) {
  const req = stagingRequestSchema.parse(body);
  const sm = pickStagingModel(aiProviders);
  const cost = stagingCredits(serverPricing, sm);
  if (isAiConfigured && sm.provider === "kie") await ensureKieBalance(sm.usdPerImage * req.variations);
  const prompt = buildStagingPrompt({ room: req.room, styleId: req.styleId, notes: req.notes });
  const rows = Array.from({ length: req.variations }, () => ({
    user_id: userId,
    kind: "staging" as const,
    mode: "staging",
    model_id: sm.id,
    endpoint: sm.endpoint,
    prompt: req.notes || null,
    params: { room: req.room, styleId: req.styleId, imageUrl: req.imageUrl },
    input:
      sm.provider === "kie"
        ? { prompt, image_urls: [absolute(req.imageUrl)], output_format: "jpeg", image_size: "auto" }
        : { prompt, image_urls: [absolute(req.imageUrl)], num_images: 1, output_format: "jpeg" },
    thumbnail_url: req.imageUrl,
    credits_cost: cost,
  }));
  return chargeAndSubmit(rows, cost * req.variations, `Mobília virtual × ${req.variations}`, userId);
}

// ------------------------------------------------------------------
// Acompanhamento
// ------------------------------------------------------------------
const inFlight = new Set<string>();
const TIMEOUT_MS = 30 * 60 * 1000;
const DEMO_DELAY_MS = 4000;

async function failAndRefund(g: Generation, msg: string) {
  const changed = await store.transitionGeneration(g.id, ["queued", "processing"], {
    status: "failed",
    error: msg,
    completed_at: new Date().toISOString(),
  });
  if (changed && g.credits_cost > 0) {
    await store.addCredits(g.user_id, g.credits_cost, "refund", "Reembolso: a IA não conseguiu gerar", g.id);
  }
}

async function complete(g: Generation, bytes: ArrayBuffer, contentType: string, ext: string) {
  const url = await store.putObject(g.user_id, `${g.kind}.${ext}`, bytes, contentType);
  await store.transitionGeneration(g.id, ["queued", "processing"], {
    status: "completed",
    output_url: url,
    completed_at: new Date().toISOString(),
  });
}

async function downloadAndComplete(g: Generation, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get("content-type") ?? (g.kind === "video" ? "video/mp4" : "image/jpeg");
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : g.kind === "video" ? "mp4" : "jpg";
  await complete(g, await res.arrayBuffer(), type, ext);
}

/** Consulta o provedor e atualiza a geração. Seguro chamar várias vezes. */
export async function refreshGeneration(g: Generation) {
  if (g.status === "completed" || g.status === "failed" || !g.fal_request_id) return;
  if (inFlight.has(g.id)) return;
  inFlight.add(g.id);
  try {
    if (Date.now() - new Date(g.created_at).getTime() > TIMEOUT_MS) {
      await failAndRefund(g, "Tempo esgotado");
      return;
    }
    // ---- modo demonstração
    if (g.fal_request_id.startsWith("demo-")) {
      if (Date.now() - new Date(g.created_at).getTime() < DEMO_DELAY_MS) return;
      const p = g.params as { startImageUrl?: string; endImageUrl?: string | null; duration?: number; imageUrl?: string };
      if (g.kind === "video") {
        const buf = await simulateVideo(p.startImageUrl!, p.endImageUrl ?? null, Math.min(p.duration ?? 5, 6));
        await complete(g, new Uint8Array(buf).buffer, "video/mp4", "mp4");
      } else {
        const buf = await simulateStaging(p.imageUrl!);
        await complete(g, new Uint8Array(buf).buffer, "image/jpeg", "jpg");
      }
      return;
    }
    // ---- Kie.ai
    if (providerOf(g) === "kie") {
      const task = await kieGetTask(g.fal_request_id);
      if (task.state === "success") {
        if (!task.urls[0]) return failAndRefund(g, "A IA não retornou o arquivo");
        try {
          await downloadAndComplete(g, task.urls[0]);
        } catch (e) {
          await failAndRefund(g, errorMessage(e));
        }
      } else if (task.state === "fail") {
        const msg = task.failMsg ?? "A IA não conseguiu gerar este vídeo";
        await failAndRefund(g, isKieNoBalance({ message: msg }) ? AI_UNAVAILABLE : msg);
      }
      return;
    }
    // ---- fal.ai
    const state = await jobStatus(g.endpoint, g.fal_request_id);
    if (state === "COMPLETED") {
      try {
        await downloadAndComplete(g, await jobResult(g.endpoint, g.fal_request_id));
      } catch (e) {
        await failAndRefund(g, errorMessage(e));
      }
    } else if (state === "FAILED") {
      await failAndRefund(g, "A IA não conseguiu gerar este vídeo");
    }
  } catch (e) {
    // 4xx do provedor ao consultar (ex.: entrada rejeitada): falha e devolve créditos
    const err = e as { status?: number };
    if (err?.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
      await failAndRefund(g, errorMessage(e));
    } else {
      console.error("[refreshGeneration]", g.id, e);
    }
  } finally {
    inFlight.delete(g.id);
  }
}

/** Lista gerações do usuário atualizando as pendentes. */
export async function listAndRefresh(userId: string) {
  const list = await store.listGenerations(userId);
  const pending = list.filter((g) => g.status === "queued" || g.status === "processing");
  if (pending.length) {
    await Promise.allSettled(pending.slice(0, 8).map((g) => refreshGeneration(g)));
    return store.listGenerations(userId);
  }
  return list;
}
