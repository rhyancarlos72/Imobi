import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

export const GET = authed(async (_req, userId) => json({ transactions: await store.listTransactions(userId) }));
