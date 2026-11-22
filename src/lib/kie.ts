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

export async function kieGetTask(taskId: string): Promise<KieTask> {
  const data = await call<{ state: KieTask["state"]; resultJson?: string | null; failMsg?: string | null; failCode?: string | null }>(
    `/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
  );
  let urls: string[] = [];
  if (data.resultJson) {
    try {
      const r = JSON.parse(data.resultJson) as { resultUrls?: string[]; resultUrl?: string };
      urls = r.resultUrls ?? (r.resultUrl ? [r.resultUrl] : []);
    } catch {
      // resultado inesperado
    }
  }
  return { state: data.state, urls, failMsg: data.failMsg || data.failCode || null };
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
