import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

export const GET = authed(async (_req, userId) => {
  const profile = await store.getProfile(userId);
  return json({ profile });
});
