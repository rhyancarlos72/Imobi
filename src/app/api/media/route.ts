import { z } from "zod";
import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

export const GET = authed(async (_req, userId) => json({ media: await store.listMedia(userId) }));

const schema = z.object({ kind: z.enum(["image", "video", "audio"]), name: z.string().min(1).max(200), url: z.string().min(1).max(1000) });
export const POST = authed(async (req, userId) => {
  const body = schema.parse(await req.json());
  return json({ media: await store.addMedia({ ...body, user_id: userId }) });
});
