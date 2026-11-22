import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemo } from "./config";
import { DEMO_USER_ID } from "./store/demo";
import { supabaseServer } from "./supabase/clients";
import { store, type Profile } from "./store";

export const DEMO_COOKIE = "imobi_demo_session";

export type SessionUser = { id: string; email: string | null };

export async function getUser(): Promise<SessionUser | null> {
  if (isDemo) {
    const c = await cookies();
    return c.get(DEMO_COOKIE)?.value ? { id: DEMO_USER_ID, email: "demo@imobi.studio" } : null;
  }
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

/** Para páginas: exige login e devolve usuário + perfil. */
export async function requireUser(): Promise<{ user: SessionUser; profile: Profile }> {
  const user = await getUser();
  if (!user) redirect("/entrar");
  const profile = await store.getProfile(user.id);
  if (!profile) redirect("/cadastro?completar=1");
  return { user, profile };
}

/** Para rotas de API: devolve o usuário ou null. */
export async function apiUser() {
  return getUser();
}
