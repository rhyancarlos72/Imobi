import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiUser } from "./auth";
import { InsufficientCreditsError } from "./store";
import { GenerationError } from "./generation";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Envolve um handler autenticado com tratamento de erros padrão. */
export function authed<C = unknown>(handler: (req: Request, userId: string, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const user = await apiUser();
    if (!user) return json({ error: "Faça login para continuar.", code: "UNAUTHENTICATED" }, 401);
    try {
      return await handler(req, user.id, ctx);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return json({ error: "Créditos insuficientes.", code: "INSUFFICIENT_CREDITS" }, 402);
      if (e instanceof GenerationError) return json({ error: e.message, code: e.code }, e.status);
      if (e instanceof ZodError) return json({ error: "Dados inválidos.", code: "INVALID", issues: e.issues }, 400);
      console.error(e);
      return json({ error: (e as Error).message ?? "Erro inesperado" }, 500);
    }
  };
}
