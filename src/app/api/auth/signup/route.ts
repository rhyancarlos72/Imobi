import { cookies } from "next/headers";
import { z } from "zod";
import { DEMO_COOKIE } from "@/lib/auth";
import { isDemo, SIGNUP_BONUS_CREDITS } from "@/lib/config";
import { publicOrigin } from "@/lib/origin";
import { json } from "@/lib/http";
import { store } from "@/lib/store";
import { DEMO_USER_ID } from "@/lib/store/demo";
import { supabaseServer } from "@/lib/supabase/clients";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2).max(120),
  account_type: z.enum(["imobiliaria", "corretor", "editor"]),
  company_name: z.string().max(120).optional().default(""),
  creci: z.string().max(40).optional().default(""),
  whatsapp: z.string().max(40).optional().default(""),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return json({ error: "Confira os campos do cadastro." }, 400);
  const { email, password, ...meta } = parsed.data;

  if (isDemo) {
    const existing = await store.getProfile(DEMO_USER_ID);
    await store.updateProfile(DEMO_USER_ID, meta);
    if (!existing) {
      await store.addCredits(DEMO_USER_ID, SIGNUP_BONUS_CREDITS, "bonus", "Créditos de boas-vindas", null);
      await store.addCredits(DEMO_USER_ID, 150, "adjustment", "Créditos de demonstração", null);
    }
    (await cookies()).set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
    return json({ ok: true, needsConfirmation: false });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta, emailRedirectTo: `${publicOrigin(req.headers)}/auth/callback` },
  });
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true, needsConfirmation: !data.session });
}
