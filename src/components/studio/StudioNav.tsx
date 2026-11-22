"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Coins, Film, Images, LogOut, Settings, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/client";
import { useStudio } from "./StudioContext";

const LINKS = [
  { href: "/studio/criar", label: "Criar", icon: Sparkles },
  { href: "/studio/galeria", label: "Galeria", icon: Images },
  { href: "/studio/editor", label: "Editor", icon: Film },
];

export function StudioNav() {
  const path = usePathname();
  const router = useRouter();
  const { credits, profile, demo } = useStudio();
  const initials = (profile.full_name ?? "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-ink-950/85 backdrop-blur-xl">
      {demo.app && (
        <div className="bg-violet-400/10 px-4 py-1.5 text-center text-[12px] text-violet-300">
          Modo demonstração: login, Pix e IA são simulados. Configure o .env para usar de verdade.
        </div>
      )}
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Link href="/studio/criar" className="shrink-0"><span className="hidden sm:inline"><Logo /></span><span className="sm:hidden"><Logo withText={false} /></span></Link>
        <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto md:ml-6">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
                  active ? "bg-white/8 text-white" : "text-ink-400 hover:bg-white/4 hover:text-ink-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-lime-400" : ""}`} /> {label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/studio/creditos"
          className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-lime-400/25 bg-lime-400/8 pl-2.5 pr-3 text-sm font-semibold text-lime-300 transition hover:bg-lime-400/15"
          title="Comprar créditos"
        >
          <Coins className="h-4 w-4" /> <span className="tabular-nums">{credits}</span>
          <span className="hidden text-lime-300/70 sm:inline">créditos</span>
        </Link>
        <div className="group relative shrink-0">
          <button className="grid h-9 w-9 place-items-center rounded-xl text-xs font-bold text-black" style={{ background: profile.brand_color }}>
            {initials}
          </button>
          <div className="invisible absolute right-0 top-11 w-56 rounded-2xl border border-white/8 bg-ink-850 p-1.5 opacity-0 shadow-2xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
            <div className="px-3 py-2">
              <div className="truncate text-sm font-semibold">{profile.full_name}</div>
              <div className="truncate text-xs text-ink-400">{profile.company_name || { imobiliaria: "Imobiliária", corretor: "Corretor(a)", editor: "Prestador de serviço" }[profile.account_type]}</div>
            </div>
            <Link href="/studio/conta" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-white/5"><Settings className="h-4 w-4" /> Conta e marca</Link>
            <Link href="/studio/creditos" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-white/5"><Coins className="h-4 w-4" /> Créditos</Link>
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-white/5"><LogOut className="h-4 w-4" /> Sair</button>
          </div>
        </div>
      </div>
    </header>
  );
}
