import Link from "next/link";
import { ArrowRight, Building2, Clapperboard, Sofa, Sparkles, Wand2, Zap } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getUser } from "@/lib/auth";

export default async function Home() {
  const user = await getUser();
  const cta = user ? "/studio/criar" : "/cadastro";
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-lime-400/10 blur-[120px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/studio/criar" className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black">Abrir estúdio</Link>
          ) : (
            <>
              <Link href="/entrar" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-300 hover:text-white">Entrar</Link>
              <Link href="/cadastro" className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black">Criar conta grátis</Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 text-center md:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-ink-200">
          <Sparkles className="h-3.5 w-3.5 text-lime-400" /> Seedance, Kling e mobília virtual num só lugar
        </span>
        <h1 className="mx-auto mt-6 max-w-4xl font-display text-[44px] font-extrabold leading-[1.02] tracking-tight md:text-[76px]">
          Fotos do imóvel viram <span className="text-gradient">vídeos que vendem</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300">
          Anime fotos com movimento de drone, mobilie cômodos vazios com IA e edite tudo num editor feito para corretores.
          Pronto para Reels, TikTok e YouTube em minutos.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href={cta} className="group inline-flex h-12 items-center gap-2 rounded-xl bg-lime-400 px-6 font-semibold text-black shadow-[0_10px_40px_-10px_rgba(198,244,50,0.7)]">
            Começar com 9 créditos grátis <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <span className="text-sm text-ink-400">Pague com Pix · sem mensalidade</span>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-4 px-5 pb-24 md:grid-cols-3">
        {[
          { icon: Wand2, t: "Animar foto", d: "Escolha o movimento de câmera (avançar, orbitar, drone...) e a IA cria um vídeo realista." },
          { icon: Sofa, t: "Antes e depois", d: "Envie o cômodo vazio, escolha o estilo e veja a mobília aparecer no vídeo." },
          { icon: Clapperboard, t: "Editor completo", d: "Linha do tempo, curvas de velocidade, textos, música e sua marca em todos os vídeos." },
          { icon: Building2, t: "Sua marca", d: "Logo, CRECI e WhatsApp aplicados automaticamente. Cartão com preço, quartos e m²." },
          { icon: Zap, t: "Créditos via Pix", d: "Compre créditos na hora com Pix. Você vê o custo antes de gerar, e se falhar o crédito volta." },
          { icon: Sparkles, t: "Para quem vende", d: "Para imobiliárias, corretores e quem presta serviço de vídeo para o mercado imobiliário." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="glass rounded-2xl p-6">
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-lime-400/10 text-lime-400"><Icon className="h-5 w-5" /></div>
            <h3 className="font-display text-lg font-semibold">{t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
