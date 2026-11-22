import { NextResponse } from "next/server";
import { isDemo } from "@/lib/config";
import { publicOrigin } from "@/lib/origin";
import { supabaseServer } from "@/lib/supabase/clients";

// Link de confirmação do e-mail do Supabase cai aqui.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const origin = publicOrigin(req.headers);
  const code = params.get("code");
  if (code && !isDemo) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/entrar?confirmado=1`);
  }
  if (params.get("error")) return NextResponse.redirect(`${origin}/entrar?erro=link`);
  return NextResponse.redirect(`${origin}/studio/criar`);
}
