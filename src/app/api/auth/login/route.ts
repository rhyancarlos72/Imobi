import { cookies } from "next/headers";
import { z } from "zod";
import { DEMO_COOKIE } from "@/lib/auth";
import { isDemo } from "@/lib/config";
import { json } from "@/lib/http";
import { store } from "@/lib/store";
import { DEMO_USER_ID } from "@/lib/store/demo";
import { supabaseServer } from "@/lib/supabase/clients";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return json({ error: "Informe e-mail e senha." }, 400);

  if (isDemo) {
    if (!(await store.getProfile(DEMO_USER_ID))) return json({ error: "Crie a conta de demonstração primeiro." }, 400);
    (await cookies()).set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
    return json({ ok: true });
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return json({ error: "E-mail ou senha incorretos." }, 400);
  return json({ ok: true });
}
