import { createVideoGenerations } from "@/lib/generation";
import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

export const maxDuration = 60;

export const POST = authed(async (req, userId) => {
  const generations = await createVideoGenerations(userId, await req.json());
  const profile = await store.getProfile(userId);
  return json({ generations, credits: profile?.credits ?? 0 });
});
