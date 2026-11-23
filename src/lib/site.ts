// Informações públicas do site: usadas no JSON-LD, robots, sitemap, llms.txt,
// versões em Markdown e no servidor MCP. Contato e redes sociais vêm do .env
// para nunca publicarmos dados falsos.
import { CREDIT_PACKAGES, formatBRL } from "./pricing";

const clean = (s: string | undefined) => (s ?? "").trim();

export const site = {
  name: "Imobi Studio",
  url: clean(process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, "") || "https://imobistudioapp.com",
  tagline: "Transforme fotos dos seus imóveis em vídeos cinematográficos com inteligência artificial, sem precisar saber editar.",
  description:
    "Plataforma para imobiliárias, corretores e agências de marketing imobiliário criarem vídeos de imóveis com IA: fotos viram vídeos com movimento de câmera, mobília virtual em cômodos vazios e editor com a marca do corretor, prontos para Instagram, TikTok, YouTube e portais.",
  locale: "pt-BR",
  country: "BR",
  email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  /** Somente dígitos com DDI, ex.: 5531988887777 */
  whatsapp: clean(process.env.NEXT_PUBLIC_CONTACT_WHATSAPP).replace(/\D/g, ""),
  /** URLs separadas por vírgula (Instagram, YouTube, LinkedIn...) */
  sameAs: clean(process.env.NEXT_PUBLIC_SOCIAL_LINKS)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s)),
  legalName: clean(process.env.NEXT_PUBLIC_LEGAL_NAME),
  cnpj: clean(process.env.NEXT_PUBLIC_CNPJ),
};

export function phoneDisplay(digits: string) {
  const d = digits.startsWith("55") ? digits.slice(2) : digits;
  if (d.length === 11) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `+${digits}`;
}

export const PUBLIC_PAGES = [
  { path: "/", title: "Início", priority: 1 },
  { path: "/sobre", title: "Sobre", priority: 0.7 },
  { path: "/precos", title: "Preços", priority: 0.8 },
  { path: "/contato", title: "Contato", priority: 0.6 },
  { path: "/termos", title: "Termos de uso", priority: 0.3 },
  { path: "/privacidade", title: "Política de privacidade", priority: 0.3 },
];

export const FEATURES = [
  { name: "Animar foto", text: "Uma foto do imóvel vira um vídeo com movimento de câmera (avançar, orbitar, drone, tour FPV)." },
  { name: "Antes e depois com mobília virtual", text: "O cômodo vazio é mobiliado por IA e o vídeo mostra a transição. Os vídeos recebem o aviso “Imagem ilustrativa”." },
  { name: "Várias fotos de uma vez", text: "Envie até 10 fotos; cada uma vira um vídeo, gerados em paralelo." },
  { name: "Escolha da IA", text: "Seedance (ByteDance) para movimento mais natural ou Kling (Kuaishou) para menor custo por vídeo." },
  { name: "Editor de vídeo", text: "Linha do tempo, curvas de velocidade, textos, música, modelos prontos e exportação em MP4 1080p." },
  { name: "Identidade visual", text: "Logo, CRECI, WhatsApp e cartão com preço, quartos, vagas e m² aplicados automaticamente." },
];

export const AUDIENCE = ["Pequenas e médias imobiliárias", "Agências de marketing imobiliário", "Corretores autônomos", "Imobiliárias de alto padrão e construtoras"];

export function pricingList() {
  return CREDIT_PACKAGES.map((p) => ({
    id: p.id,
    name: p.name,
    credits: p.credits + p.bonus,
    price: formatBRL(p.priceCents),
    priceValue: p.priceCents / 100,
    description: p.description,
  }));
}

export const FAQ = [
  { q: "Preciso saber editar vídeo?", a: "Não. Você envia as fotos, escolhe o movimento e a IA gera o vídeo. O editor é opcional para juntar clipes e colocar sua marca." },
  { q: "Como funciona a cobrança?", a: "Você compra créditos com Pix e usa quando quiser. Não há mensalidade e os créditos não expiram. O custo aparece antes de gerar." },
  { q: "E se a IA falhar?", a: "Os créditos voltam automaticamente para a sua conta." },
  { q: "Quanto tempo leva?", a: "Normalmente de 2 a 6 minutos por vídeo, dependendo da fila da IA. Vários vídeos são gerados ao mesmo tempo." },
  { q: "Posso usar mobília virtual nos anúncios?", a: "Sim. Os vídeos com mobília virtual recebem o aviso “Imagem ilustrativa” para não induzir o comprador ao erro." },
];
