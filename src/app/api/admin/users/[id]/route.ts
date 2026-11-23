import { z } from "zod";
import { adminOnly } from "@/lib/admin";
import { json } from "@/lib/http";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("credits"), delta: z.number().int().min(-100000).max(100000).refine((n) => n !== 0), reason: z.string().max(200).optional() }),
  z.object({ action: z.literal("ban"), banned: z.boolean() }),
]);

// Detalhes do usuário: transações e gerações
export const GET = adminOnly<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const [profile, transactions, generations] = await Promise.all([store.getProfile(id), store.listTransactions(id), store.listGenerations(id, 50)]);
  if (!profile) return json({ error: "Usuário não encontrado" }, 404);
  return json({ profile, transactions, generations });
});

export const POST = adminOnly<Ctx>(async (req, { params }, adminEmail) => {
  const { id } = await params;
  const body = schema.parse(await req.json());
  if (body.action === "credits") {
    const reason = `${body.delta > 0 ? "Crédito" : "Débito"} manual (admin)${body.reason ? `: ${body.reason}` : ""}`;
    const credits = await store.adminAdjustCredits(id, body.delta, reason);
    console.log(`[admin] ${adminEmail} ajustou ${body.delta} créditos de ${id}`);
    return json({ credits });
  }
  await store.adminSetBanned(id, body.banned);
  console.log(`[admin] ${adminEmail} ${body.banned ? "bloqueou" : "desbloqueou"} ${id}`);
  return json({ ok: true });
});
