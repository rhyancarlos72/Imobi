// Status para o dono do app (e-mails em ADMIN_EMAILS): saldo do Kie.ai e alertas.
import { apiUser } from "@/lib/auth";
import { env, isAdminEmail, isKieConfigured, isPaymentConfigured } from "@/lib/config";
import { json } from "@/lib/http";
import { KIE_CREDITS_PER_USD, kieBalance } from "@/lib/kie";

export async function GET() {
  const user = await apiUser();
  if (!user || !isAdminEmail(user.email)) return json({ error: "não autorizado" }, 403);

  let kie: { configured: boolean; credits: number | null; usd: number | null; low: boolean; error?: string } = {
    configured: isKieConfigured,
    credits: null,
    usd: null,
    low: false,
  };
  if (isKieConfigured) {
    try {
      const credits = await kieBalance(true);
      const usd = credits / KIE_CREDITS_PER_USD;
      kie = { configured: true, credits, usd, low: usd < env.kieLowBalanceUsd };
    } catch (e) {
      kie = { ...kie, error: (e as Error).message };
    }
  }
  return json({ kie, thresholdUsd: env.kieLowBalanceUsd, payments: isPaymentConfigured });
}
