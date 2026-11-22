import { listAndRefresh } from "@/lib/generation";
import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

export const maxDuration = 60;

export const GET = authed(async (_req, userId) => {
  const generations = await listAndRefresh(userId);
  const profile = await store.getProfile(userId);
  return json({ generations, credits: profile?.credits ?? 0 });
});
