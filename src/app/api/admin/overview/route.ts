import { adminOnly } from "@/lib/admin";
import { isKieConfigured } from "@/lib/config";
import { json } from "@/lib/http";
import { KIE_CREDITS_PER_USD, kieBalance } from "@/lib/kie";
import { store } from "@/lib/store";

export const GET = adminOnly(async () => {
  const stats = await store.adminStats();
  let kieUsd: number | null = null;
  if (isKieConfigured) kieUsd = await kieBalance(true).then((c) => c / KIE_CREDITS_PER_USD).catch(() => null);
  return json({ stats, kieUsd });
});
