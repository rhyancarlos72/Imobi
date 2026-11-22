import { NextResponse } from "next/server";
import { isDemo } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/clients";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code && !isDemo) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/studio/criar", url.origin));
}
