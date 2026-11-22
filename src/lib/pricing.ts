// Conversão do custo da IA (em dólar) para créditos do app.
// 1 crédito = R$ CREDIT_VALUE_BRL (padrão R$ 1,00).
// créditos = custo_usd × cotação × margem ÷ valor_do_crédito (arredondado para cima)
//
// Os valores abaixo têm fallback para o navegador. No servidor, o preço cobrado
// é sempre recalculado com os valores do .env, nunca confiando no cliente.

import { STAGING_MODEL, type VideoModel } from "./models";

export type PricingParams = { usdToBrl: number; markup: number; creditValueBrl: number };

export const DEFAULT_PRICING: PricingParams = {
  usdToBrl: Number(process.env.NEXT_PUBLIC_USD_TO_BRL ?? "5.6"),
  markup: Number(process.env.NEXT_PUBLIC_CREDIT_MARKUP ?? "2.2"),
  creditValueBrl: Number(process.env.NEXT_PUBLIC_CREDIT_VALUE_BRL ?? "1"),
};

function usdToCredits(usd: number, p: PricingParams) {
  return Math.max(1, Math.ceil((usd * p.usdToBrl * p.markup) / p.creditValueBrl));
}

export function videoCostUsd(model: VideoModel, seconds: number, audio: boolean) {
  const perSecond = audio && model.supportsAudio && model.usdPerSecondAudio ? model.usdPerSecondAudio : model.usdPerSecond;
  return perSecond * seconds;
}

export function videoCredits(model: VideoModel, seconds: number, audio: boolean, p: PricingParams = DEFAULT_PRICING) {
  return usdToCredits(videoCostUsd(model, seconds, audio), p);
}

export function stagingCredits(p: PricingParams = DEFAULT_PRICING) {
  return usdToCredits(STAGING_MODEL.usdPerImage, p);
}

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  priceCents: number;
  highlight?: boolean;
  description: string;
};

// Pacotes vendidos via Pix. Ajuste à vontade.
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "start", name: "Start", credits: 50, bonus: 0, priceCents: 4900, description: "Para testar com 2 ou 3 imóveis" },
  { id: "pro", name: "Profissional", credits: 150, bonus: 20, priceCents: 12900, highlight: true, description: "O mais escolhido por corretores" },
  { id: "agencia", name: "Imobiliária", credits: 400, bonus: 80, priceCents: 29900, description: "Para equipes e prestadores de serviço" },
];

export function getPackage(id: string) {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
