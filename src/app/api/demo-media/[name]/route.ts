// Só no modo demonstração: guarda e serve arquivos locais (com suporte a Range p/ vídeo).
import { createReadStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { apiUser } from "@/lib/auth";
import { isDemo } from "@/lib/config";
import { DEMO_MEDIA_DIR } from "@/lib/store/demo";

type Ctx = { params: Promise<{ name: string }> };

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg",
};

function filePath(name: string) {
  const safe = path.basename(name);
  if (!/^[\w.-]+$/.test(safe)) return null;
  return path.join(DEMO_MEDIA_DIR, safe);
}

export async function PUT(req: Request, { params }: Ctx) {
  if (!isDemo) return new Response("not found", { status: 404 });
  if (!(await apiUser())) return new Response("unauthorized", { status: 401 });
  const p = filePath((await params).name);
  if (!p) return new Response("bad name", { status: 400 });
  await fs.mkdir(DEMO_MEDIA_DIR, { recursive: true });
  await fs.writeFile(p, Buffer.from(await req.arrayBuffer()));
  return new Response(null, { status: 204 });
}

export async function GET(req: Request, { params }: Ctx) {
  if (!isDemo) return new Response("not found", { status: 404 });
  const p = filePath((await params).name);
  if (!p) return new Response("bad name", { status: 400 });
  let stat;
  try {
    stat = await fs.stat(p);
  } catch {
    return new Response("not found", { status: 404 });
  }
  const type = TYPES[p.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range");
  const common = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*" };
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
    const stream = Readable.toWeb(createReadStream(p, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...common, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(createReadStream(p)) as ReadableStream;
  return new Response(stream, { headers: { ...common, "Content-Length": String(stat.size) } });
}
