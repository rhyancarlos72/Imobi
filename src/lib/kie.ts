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
