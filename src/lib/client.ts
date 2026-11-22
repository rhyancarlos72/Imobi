"use client";
// Helpers do navegador: chamadas à API e upload de arquivos.
import { supabaseBrowser } from "./supabase/browser";

export class ApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: { ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Erro ${res.status}`, (data as { code?: string }).code, res.status);
  return data as T;
}

export type MediaKind = "image" | "video" | "audio";

export function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

type Ticket =
  | { mode: "supabase"; path: string; token: string; publicUrl: string }
  | { mode: "demo"; uploadUrl: string; publicUrl: string };

/** Envia um arquivo direto para o storage e registra na biblioteca do usuário. */
export async function uploadFile(file: File, opts: { register?: boolean } = {}) {
  const kind = kindOf(file);
  if (!kind) throw new ApiError("Tipo de arquivo não suportado");
  const contentType = file.type || "application/octet-stream";
  const ticket = await api<Ticket>("/api/upload", { json: { filename: file.name, contentType } });
  if (ticket.mode === "demo") {
    const r = await fetch(ticket.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
    if (!r.ok) throw new ApiError("Falha no upload");
  } else {
    const { error } = await supabaseBrowser().storage.from("media").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType });
    if (error) throw new ApiError("Falha no upload: " + error.message);
  }
  if (opts.register !== false) {
    await api("/api/media", { json: { kind, name: file.name, url: ticket.publicUrl } });
  }
  return { url: ticket.publicUrl, kind, name: file.name };
}

export function formatCredits(n: number) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? "crédito" : "créditos"}`;
}
