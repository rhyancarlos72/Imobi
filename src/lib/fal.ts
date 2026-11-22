import "server-only";
// Integração com o fal.ai (fila assíncrona). Sem FAL_KEY, simula a geração
// localmente com ffmpeg (efeito de zoom na foto) para o modo demonstração.
import { fal } from "@fal-ai/client";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { env, isFalConfigured } from "./config";

if (isFalConfigured) fal.config({ credentials: env.falKey });

export type QueueState = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export async function submitJob(endpoint: string, input: Record<string, unknown>, webhookUrl?: string) {
  if (!isFalConfigured) return { requestId: `demo-${crypto.randomUUID()}` };
  const res = await fal.queue.submit(endpoint, { input, webhookUrl });
  return { requestId: res.request_id };
}

export async function jobStatus(endpoint: string, requestId: string): Promise<QueueState> {
  const s = await fal.queue.status(endpoint, { requestId, logs: false });
  return s.status as QueueState;
}

/** Busca o resultado e devolve a URL do arquivo principal (vídeo ou imagem). */
export async function jobResult(endpoint: string, requestId: string): Promise<string> {
  const r = await fal.queue.result(endpoint, { requestId });
  const data = r.data as { video?: { url: string }; images?: { url: string }[]; image?: { url: string } };
  const url = data.video?.url ?? data.images?.[0]?.url ?? data.image?.url;
  if (!url) throw new Error("O modelo não retornou arquivo.");
  return url;
}

/** Converte um erro do fal em mensagem legível. */
export function falErrorMessage(e: unknown): string {
  const err = e as { status?: number; body?: { detail?: unknown }; message?: string };
  const detail = err?.body?.detail;
  if (detail) return typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400);
  return err?.message ?? "Erro desconhecido no provedor de IA";
}

// ------------------------------------------------------------------
// Simulação (modo demo)
// ------------------------------------------------------------------
const execFileP = promisify(execFile);

async function readSource(url: string): Promise<Buffer> {
  if (url.startsWith("/api/demo-media/")) {
    const { DEMO_MEDIA_DIR } = await import("./store/demo");
    return fs.readFile(path.join(DEMO_MEDIA_DIR, path.basename(url)));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download falhou (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Gera um MP4 de "Ken Burns" a partir da foto, imitando a saída da IA. */
export async function simulateVideo(startUrl: string, endUrl: string | null, seconds: number): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "imobi-"));
  try {
    const a = path.join(dir, "a.img");
    await fs.writeFile(a, await readSource(startUrl));
    const out = path.join(dir, "out.mp4");
    const fps = 30;
    const frames = seconds * fps;
    const zoom = `scale=2560:-2,zoompan=z='min(1+0.0009*on,1.35)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=${fps}`;
    if (endUrl) {
      const b = path.join(dir, "b.img");
      await fs.writeFile(b, await readSource(endUrl));
      const half = Math.floor(frames / 2);
      await execFileP("ffmpeg", [
        "-y", "-i", a, "-i", b,
        "-filter_complex",
        `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='1+0.0006*on':d=${frames}:s=1280x720:fps=${fps}[v0];` +
          `[1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='1+0.0006*on':d=${frames}:s=1280x720:fps=${fps}[v1];` +
          `[v0][v1]xfade=transition=fade:duration=${(seconds / 2).toFixed(2)}:offset=${(half / fps / 2).toFixed(2)},format=yuv420p[v]`,
        "-map", "[v]", "-t", String(seconds), "-c:v", "libx264", "-preset", "veryfast", "-movflags", "+faststart", out,
      ]);
    } else {
      await execFileP("ffmpeg", [
        "-y", "-i", a, "-vf", `${zoom},format=yuv420p`, "-t", String(seconds),
        "-c:v", "libx264", "-preset", "veryfast", "-movflags", "+faststart", out,
      ]);
    }
    return await fs.readFile(out);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/** "Mobília virtual" simulada: aplica um filtro quente na foto e escreve um selo. */
export async function simulateStaging(imageUrl: string): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "imobi-"));
  try {
    const a = path.join(dir, "a.img");
    await fs.writeFile(a, await readSource(imageUrl));
    const out = path.join(dir, "out.jpg");
    await execFileP("ffmpeg", [
      "-y", "-i", a, "-vf",
      "scale=1600:-2,eq=saturation=1.25:brightness=0.03,colorbalance=rs=0.08:bs=-0.06,drawbox=x=0:y=ih-90:w=iw:h=90:color=black@0.45:t=fill",
      "-frames:v", "1", out,
    ]);
    return await fs.readFile(out);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
