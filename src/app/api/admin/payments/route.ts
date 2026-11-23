import { adminOnly } from "@/lib/admin";
import { json } from "@/lib/http";
import { store } from "@/lib/store";

export const GET = adminOnly(async () => json({ payments: await store.adminListPayments() }));
