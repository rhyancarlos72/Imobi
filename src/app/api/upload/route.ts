import { z } from "zod";
import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

const ALLOWED = /^(image\/(jpeg|png|webp|avif|heic|heif)|video\/(mp4|quicktime|webm)|audio\/(mpeg|mp3|wav|x-wav|aac|mp4|x-m4a|ogg))$/;
const schema = z.object({ filename: z.string().min(1).max(200), contentType: z.string().regex(ALLOWED, "Tipo de arquivo não suportado") });

/** Devolve um ticket para o navegador enviar o arquivo direto ao storage. */
export const POST = authed(async (req, userId) => {
  const { filename, contentType } = schema.parse(await req.json());
  return json(await store.createUpload(userId, filename, contentType));
});
