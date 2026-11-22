import "server-only";
// Integração com o Kie.ai (Market API).
// Docs: https://docs.kie.ai  — POST /api/v1/jobs/createTask e GET /api/v1/jobs/recordInfo
import { env } from "./config";

const BASE = process.env.KIE_API_BASE ?? "https://api.kie.ai/api/v1";

type Envelope<T> = { code: number; msg?: string; message?: string; data: T };

export class KieError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${env.kieKey}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: Envelope<T> | null = null;
  try {
    body = JSON.parse(text) as Envelope<T>;
  } catch {
    throw new KieError(`Kie.ai ${res.status}: ${text.slice(0, 200)}`, res.status);
  }
  // O Kie responde HTTP 200 com { code } próprio (ex.: 402 = saldo insuficiente)
  if (!res.ok || body.code !== 200) {
    const msg = body.msg ?? body.message ?? `erro ${body.code ?? res.status}`;
    throw new KieError(`Kie.ai: ${msg}`, body.code ?? res.status);
  }
  return body.data;
}

export async function kieCreateTask(model: string, input: Record<string, unknown>, callBackUrl?: string) {
  const data = await call<{ taskId: string }>("/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({ model, input, ...(callBackUrl ? { callBackUrl } : {}) }),
  });
  if (!data?.taskId) throw new KieError("Kie.ai não retornou taskId");
  return data.taskId;
}

export type KieTask = { state: "waiting" | "queuing" | "generating" | "success" | "fail"; urls: string[]; failMsg: string | null };

/** Procura URLs de resultado em qualquer formato que o Kie devolva. */
function extractUrls(v: unknown, depth = 0): string[] {
  if (depth > 5 || v == null) return [];
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        return extractUrls(JSON.parse(t), depth + 1);
      } catch {
        return [];
      }
    }
    return /^https?:\/\/\S+\.(mp4|mov|webm|jpe?g|png|webp)(\?|$)/i.test(t) ? [t] : [];
  }
  if (Array.isArray(v)) return v.flatMap((x) => extractUrls(x, depth + 1));
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const preferred = ["resultUrls", "resultUrl", "videoUrl", "video_url", "url", "urls", "resultJson", "response", "result", "output"];
    for (const k of preferred) {
      if (k in o) {
        const found = extractUrls(o[k], depth + 1);
        if (found.length) return found;
      }
    }
    return Object.values(o).flatMap((x) => extractUrls(x, depth + 1));
  }
  return [];
}

const logged = new Set<string>();

export async function kieGetTask(taskId: string): Promise<KieTask> {
  const data = await call<Record<string, unknown>>(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
  const rawState = String(data?.state ?? data?.status ?? "").toLowerCase();
  const flag = data?.successFlag;
  const urls = extractUrls(data);
  const failMsg = (data?.failMsg as string) || (data?.errorMessage as string) || (data?.failCode as string) || null;

  let state: KieTask["state"] = "generating";
  if (["success", "succeeded", "completed", "complete", "done", "finished"].includes(rawState) || flag === 1) state = "success";
  else if (["fail", "failed", "error", "failure", "cancelled", "canceled"].includes(rawState) || flag === 2 || flag === 3) state = "fail";
  else if (rawState === "waiting" || rawState === "queuing") state = rawState;
  else if (!rawState && urls.length) state = "success";

  // registra o formato da resposta uma vez por tarefa (ajuda a diagnosticar)
  const key = `${taskId}:${rawState}`;
  if (!logged.has(key)) {
    logged.add(key);
    const preview = JSON.stringify(data).slice(0, 600);
    console.log(`[kie] task ${taskId} state=${rawState || "?"} -> ${state} urls=${urls.length} ${state !== "generating" && state !== "waiting" && state !== "queuing" ? preview : ""}`);
  }
  return { state, urls, failMsg };
}

/** 1 US$ = 200 créditos Kie (tabela pública do Kie.ai). */
export const KIE_CREDITS_PER_USD = 200;

let balanceCache: { credits: number; at: number } | null = null;

/** Saldo atual da conta no Kie.ai (em créditos Kie). Cache de 30 s. */
export async function kieBalance(force = false): Promise<number> {
  if (!force && balanceCache && Date.now() - balanceCache.at < 30_000) return balanceCache.credits;
  const data = await call<number | { credits?: number; balance?: number }>("/chat/credit");
  const credits = typeof data === "number" ? data : Number(data?.credits ?? data?.balance ?? 0);
  balanceCache = { credits, at: Date.now() };
  return credits;
}

export function invalidateKieBalance() {
  balanceCache = null;
}

/** Erro do Kie por falta de saldo na conta do dono do app. */
export function isKieNoBalance(e: unknown) {
  const err = e as { status?: number; message?: string };
  return err?.status === 402 || /insufficient|balance|top up/i.test(err?.message ?? "");
}
