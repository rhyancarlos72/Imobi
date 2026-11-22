import { cookies } from "next/headers";
import { DEMO_COOKIE } from "@/lib/auth";
import { isDemo } from "@/lib/config";
import { json } from "@/lib/http";
import { supabaseServer } from "@/lib/supabase/clients";

export async function POST() {
  if (isDemo) (await cookies()).delete(DEMO_COOKIE);
  else await (await supabaseServer()).auth.signOut();
  return json({ ok: true });
}
