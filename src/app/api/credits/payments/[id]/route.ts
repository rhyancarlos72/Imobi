import { authed, json } from "@/lib/http";
import { syncPayment } from "@/lib/payments";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

/** O navegador consulta aqui a cada poucos segundos enquanto o QR Code está aberto. */
export const GET = authed<Ctx>(async (_req, userId, { params }) => {
  const { id } = await params;
  const payment = await store.getPayment(id);
  if (!payment || payment.user_id !== userId) return json({ error: "Pagamento não encontrado" }, 404);
  const synced = await syncPayment(payment).catch(() => payment);
  const profile = await store.getProfile(userId);
  return json({ payment: synced, credits: profile?.credits ?? 0 });
});
