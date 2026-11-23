import Link from "next/link";
import { Logo } from "./Logo";
import { phoneDisplay, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/6 bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-400">{site.tagline}</p>
          {site.legalName && <p className="mt-3 text-xs text-ink-500">{site.legalName}{site.cnpj ? ` · CNPJ ${site.cnpj}` : ""}</p>}
        </div>
        <nav aria-label="Institucional" className="text-sm">
          <div className="mb-3 font-semibold text-ink-200">Empresa</div>
          <ul className="space-y-2 text-ink-400">
            <li><Link href="/sobre" className="hover:text-white">Sobre</Link></li>
            <li><Link href="/precos" className="hover:text-white">Preços</Link></li>
            <li><Link href="/contato" className="hover:text-white">Contato</Link></li>
            <li><Link href="/termos" className="hover:text-white">Termos de uso</Link></li>
            <li><Link href="/privacidade" className="hover:text-white">Política de privacidade</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <div className="mb-3 font-semibold text-ink-200">Fale com a gente</div>
          <ul className="space-y-2 text-ink-400">
            {site.email && <li><a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a></li>}
            {site.whatsapp && (
              <li>
                <a href={`tel:+${site.whatsapp}`} className="hover:text-white">{phoneDisplay(site.whatsapp)}</a>
                {" · "}
                <a href={`https://wa.me/${site.whatsapp}`} className="hover:text-white">WhatsApp</a>
              </li>
            )}
            {site.sameAs.map((u) => <li key={u}><a href={u} rel="me noreferrer" className="hover:text-white">{new URL(u).hostname.replace(/^www\./, "")}</a></li>)}
            {!site.email && !site.whatsapp && <li><Link href="/contato" className="hover:text-white">Página de contato</Link></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/6 py-5 text-center text-xs text-ink-500">© {new Date().getFullYear()} {site.name}. Todos os direitos reservados.</div>
    </footer>
  );
}
