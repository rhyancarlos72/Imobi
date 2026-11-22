import "server-only";
// Compra de créditos via Pix. Escolhe Woovi ou Efí (PAYMENT_PROVIDER) e, se o
// principal falhar, tenta o outro. Sem nenhum configurado, usa o modo demo.
import { env, isDemo, isEfiConfigured, isWooviConfigured } from "../config";
import { getPackage } from "../pricing";
import { store, type Payment } from "../store";
import { efiChargeStatus, efiCreateCharge } from "./efi";
import { wooviChargeStatus, wooviCreateCharge } from "./woovi";

type Provider = Payment["provider"];

function providerOrder(): Provider[] {
  const all: Provider[] = [];
  const primary = env.paymentProvider;
  const ok = (p: Provider) => (p === "woovi" ? isWooviConfigured : p === "efi" ? isEfiConfigured : false);
  if (ok(primary)) all.push(primary);
  (["woovi", "efi"] as Provider[]).forEach((p) => {
    if (p !== primary && ok(p)) all.push(p);
  });
  if (all.length) return all;
  // Pix simulado só existe no modo demonstração (sem banco real)
  if (isDemo) return ["demo"];
  throw new Error("Pagamento por Pix ainda não está disponível. Tente novamente mais tarde.");
}

const DEMO_BRCODE =
  "00020101021226830014br.gov.bcb.pix2561qrcodes.exemplo.com/demo-imobi-studio520400005303986540510.005802BR5912IMOBI STUDIO6009SAO PAULO62070503***6304ABCD";

export async function createCreditCharge(userId: string, packageId: string) {
  const pkg = getPackage(packageId);
  if (!pkg) throw new Error("Pacote inválido");
  const credits = pkg.credits + pkg.bonus;
  const errors: string[] = [];

  for (const provider of providerOrder()) {
    try {
      const correlationID = `imobi-${crypto.randomUUID()}`;
      const desc = `Imobi Studio - ${credits} créditos`;
      const charge =
        provider === "woovi"
          ? await wooviCreateCharge({ correlationID, valueCents: pkg.priceCents, comment: desc })
          : provider === "efi"
            ? await efiCreateCharge({ valueCents: pkg.priceCents, description: desc })
            : {
                providerRef: correlationID,
                brCode: DEMO_BRCODE,
                qrCodeImage: null,
                paymentLink: null,
                expiresAt: new Date(Date.now() + 3600_000).toISOString(),
              };
      return await store.createPayment({
        user_id: userId,
        provider,
        provider_ref: charge.providerRef,
        package_id: pkg.id,
        credits,
        amount_cents: pkg.priceCents,
        br_code: charge.brCode,
        qr_code_image: charge.qrCodeImage,
        payment_link: charge.paymentLink,
        expires_at: charge.expiresAt,
      });
    } catch (e) {
      console.error(`[pix:${provider}]`, e);
      errors.push(`${provider}: ${(e as Error).message}`);
    }
  }
  throw new Error("Não foi possível gerar o Pix agora. " + errors.join(" | "));
}

/** Confere no provedor e credita se pago. Idempotente. */
export async function syncPayment(payment: Payment): Promise<Payment> {
  if (payment.status !== "pending" || !payment.provider_ref) return payment;
  let status: "paid" | "pending" | "expired" = "pending";
  if (payment.provider === "woovi") status = await wooviChargeStatus(payment.provider_ref);
  else if (payment.provider === "efi") status = await efiChargeStatus(payment.provider_ref);
  else if (payment.expires_at && new Date(payment.expires_at) < new Date()) status = "expired";

  if (status === "paid") await store.markPaymentPaid(payment.id);
  else if (status === "expired") await store.updatePayment(payment.id, { status: "expired" });
  return (await store.getPayment(payment.id)) ?? payment;
}
