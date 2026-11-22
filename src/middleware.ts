import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "./lib/origin";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Mantém a sessão do Supabase renovada e protege /studio.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (!url || !key || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // modo demonstração
    if (req.nextUrl.pathname.startsWith("/studio") && !req.cookies.get("imobi_demo_session")) {
      return NextResponse.redirect(`${publicOrigin(req.headers)}/entrar`);
    }
    return res;
  }
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (req.nextUrl.pathname.startsWith("/studio") && !data.user) {
    return NextResponse.redirect(`${publicOrigin(req.headers)}/entrar`);
  }
  return res;
}

export const config = {
  matcher: ["/studio/:path*", "/api/:path*", "/auth/:path*"],
};
