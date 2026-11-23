import "server-only";
import { apiUser } from "./auth";
import { isAdminEmail } from "./config";
import { json } from "./http";

/** Envolve rotas do painel admin: só e-mails em ADMIN_EMAILS. */
export function adminOnly<C = unknown>(handler: (req: Request, ctx: C, adminEmail: string) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const user = await apiUser();
    if (!user || !isAdminEmail(user.email)) return json({ error: "Acesso restrito ao administrador." }, 403);
    try {
      return await handler(req, ctx, user.email!);
    } catch (e) {
      console.error("[admin]", e);
      return json({ error: (e as Error).message }, 500);
    }
  };
}
