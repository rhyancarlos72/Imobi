import "server-only";
import { json } from "@/lib/http";
import { syncPayment } from "@/lib/payments";
import { store } from "@/lib/store";

// A Efí envia { pix: [{ txid, valor, ... }] }. Conferimos cada txid na API antes de creditar.
export async function handleEfiWebhook(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { pix?: { txid?: string }[] };
  for (const p of body.pix ?? []) {
    if (!p.txid) continue;
    const payment = await store.findPaymentByRef("efi", p.txid);
    if (payment) await syncPayment(payment).catch((e) => console.error("[webhook:efi]", e));
  }
  return json({ ok: true });
}
