import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { Logo } from "./Logo";
import { Markdown } from "./Markdown";
import { SiteFooter } from "./SiteFooter";
import { WebMcp } from "./WebMcp";
import { pageMarkdown } from "@/lib/content";
import { pageJsonLd } from "@/lib/jsonld";

export function PublicPage({ path }: { path: string }) {
  const page = pageMarkdown(path)!;
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={pageJsonLd(path, page.title, page.description)} />
      <WebMcp />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/"><Logo /></Link>
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-300 hover:text-white">Entrar</Link>
          <Link href="/cadastro" className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black">Criar conta grátis</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-20 pt-8">
        <Markdown md={page.md} />
      </main>
      <SiteFooter />
    </div>
  );
}

export function publicMetadata(path: string) {
  const page = pageMarkdown(path)!;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path, types: { "text/markdown": `/md${path === "/" ? "" : path}` } },
    openGraph: { title: page.title, description: page.description, url: path, type: "website" as const, locale: "pt_BR", siteName: "Imobi Studio" },
  };
}
