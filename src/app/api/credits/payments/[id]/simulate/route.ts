import { isDemo } from "@/lib/config";
import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

/** Só no modo demonstração (sem Woovi/Efí): simula o pagamento do Pix. */
export const POST = authed<Ctx>(async (_req, userId, { params }) => {
  if (!isDemo) return json({ error: "Indisponível" }, 404);
  const { id } = await params;
  const payment = await store.getPayment(id);
  if (!payment || payment.user_id !== userId || payment.provider !== "demo") return json({ error: "Pagamento não encontrado" }, 404);
  await store.markPaymentPaid(id);
  return json({ ok: true });
});
