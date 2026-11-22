// Webhook da Woovi. Não confiamos no corpo: usamos só o correlationID e
// conferimos o status direto na API da Woovi antes de creditar.
import { json } from "@/lib/http";
import { syncPayment } from "@/lib/payments";
import { store } from "@/lib/store";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { charge?: { correlationID?: string }; pix?: { charge?: { correlationID?: string } } };
  const ref = body.charge?.correlationID ?? body.pix?.charge?.correlationID;
  if (!ref) return json({ ok: true }); // teste de webhook da Woovi
  const payment = await store.findPaymentByRef("woovi", ref);
  if (payment) await syncPayment(payment).catch((e) => console.error("[webhook:woovi]", e));
  return json({ ok: true });
}
