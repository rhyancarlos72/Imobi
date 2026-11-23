"use client";
// Fontes disponíveis para textos e cartão do imóvel (pacotes @fontsource importados no layout).
import type { FontId } from "./types";

export const FONTS: { id: FontId; name: string; cssVar: string; heavy: number; regular: number; sample: string }[] = [
  { id: "display", name: "Bricolage", cssVar: "--font-display", heavy: 800, regular: 600, sample: "Aa" },
  { id: "sans", name: "Geist", cssVar: "--font-geist-sans", heavy: 700, regular: 600, sample: "Aa" },
  { id: "montserrat", name: "Montserrat", cssVar: "--font-montserrat", heavy: 800, regular: 600, sample: "Aa" },
  { id: "poppins", name: "Poppins", cssVar: "--font-poppins", heavy: 700, regular: 500, sample: "Aa" },
  { id: "serif", name: "Playfair", cssVar: "--font-serif", heavy: 700, regular: 500, sample: "Aa" },
  { id: "bebas", name: "Bebas Neue", cssVar: "--font-bebas", heavy: 400, regular: 400, sample: "AA" },
];

export function fontFamily(id: FontId) {
  const f = FONTS.find((x) => x.id === id) ?? FONTS[0];
  if (typeof document === "undefined") return "sans-serif";
  const v = getComputedStyle(document.body).getPropertyValue(f.cssVar).trim();
  return v || "sans-serif";
}

export function fontWeight(id: FontId, heavy: boolean) {
  const f = FONTS.find((x) => x.id === id) ?? FONTS[0];
  return heavy ? f.heavy : f.regular;
}

/** Garante que a fonte foi baixada antes de desenhar no canvas. */
export async function ensureFont(id: FontId) {
  if (typeof document === "undefined" || !document.fonts) return;
  const fam = fontFamily(id);
  try {
    await Promise.all([document.fonts.load(`${fontWeight(id, true)} 48px ${fam}`), document.fonts.load(`${fontWeight(id, false)} 48px ${fam}`)]);
  } catch {}
}
