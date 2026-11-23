import { adminOnly } from "@/lib/admin";
import { json } from "@/lib/http";
import { syncPayment } from "@/lib/payments";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

// action "sync": consulta de novo no provedor; "mark-paid": confirma manualmente (credita uma vez)
export const POST = adminOnly<Ctx>(async (req, { params }, adminEmail) => {
  const { id } = await params;
  const { action } = (await req.json()) as { action?: string };
  const payment = await store.getPayment(id);
  if (!payment) return json({ error: "Pagamento não encontrado" }, 404);
  if (action === "sync") return json({ payment: await syncPayment(payment) });
  if (action === "mark-paid") {
    const credited = await store.markPaymentPaid(id);
    console.log(`[admin] ${adminEmail} marcou pagamento ${id} como pago (creditou: ${credited})`);
    return json({ payment: await store.getPayment(id), credited });
  }
  return json({ error: "Ação inválida" }, 400);
});
