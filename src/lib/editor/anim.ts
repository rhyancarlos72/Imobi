// Animações de entrada dos textos e elementos (cartão, marca, contato).
export type AnimId = "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "pop" | "zoom-out" | "blur" | "wipe" | "typewriter" | "none";

export const ANIMS: { id: AnimId; name: string; hint: string; textOnly?: boolean }[] = [
  { id: "slide-up", name: "Subir", hint: "Entra de baixo para cima" },
  { id: "fade", name: "Esmaecer", hint: "Aparece suavemente" },
  { id: "pop", name: "Pop", hint: "Cresce com um leve salto, chama atenção" },
  { id: "zoom-out", name: "Zoom cinema", hint: "Chega de perto e assenta, estilo trailer" },
  { id: "blur", name: "Foco", hint: "Sai do desfoque, elegante para alto padrão" },
  { id: "wipe", name: "Revelar", hint: "Revela da esquerda para a direita" },
  { id: "slide-left", name: "Da direita", hint: "Desliza da direita" },
  { id: "slide-right", name: "Da esquerda", hint: "Desliza da esquerda" },
  { id: "slide-down", name: "Descer", hint: "Entra de cima para baixo" },
  { id: "typewriter", name: "Digitando", hint: "Letra por letra", textOnly: true },
  { id: "none", name: "Sem animação", hint: "Aparece direto" },
];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const backOut = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp(t, 0, 1);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function entranceDuration(id: AnimId, textLength = 0) {
  if (id === "none") return 0.001;
  if (id === "typewriter") return clamp(textLength * 0.045, 0.4, 1.6);
  if (id === "zoom-out" || id === "blur") return 0.8;
  if (id === "wipe") return 0.7;
  return 0.55;
}

export type Frame = { alpha: number; dx: number; dy: number; s: number; blur: number; wipe: number; chars: number };

/** Estado da animação no progresso linear p (0 = começo, 1 = pronto). dx/dy/blur em px de referência (multiplicar por k). */
export function animFrame(id: AnimId, p: number): Frame {
  const e = easeOut(p);
  const f: Frame = { alpha: 1, dx: 0, dy: 0, s: 1, blur: 0, wipe: 1, chars: 1 };
  switch (id) {
    case "fade":
      f.alpha = e;
      break;
    case "slide-up":
      f.alpha = e;
      f.dy = (1 - e) * 70;
      break;
    case "slide-down":
      f.alpha = e;
      f.dy = -(1 - e) * 70;
      break;
    case "slide-left":
      f.alpha = e;
      f.dx = (1 - e) * 160;
      break;
    case "slide-right":
      f.alpha = e;
      f.dx = -(1 - e) * 160;
      break;
    case "pop":
      f.alpha = clamp(p * 2.5, 0, 1);
      f.s = 0.55 + 0.45 * backOut(p);
      break;
    case "zoom-out":
      f.alpha = e;
      f.s = 1.45 - 0.45 * e;
      break;
    case "blur":
      f.alpha = e;
      f.blur = (1 - e) * 22;
      f.s = 1.04 - 0.04 * e;
      break;
    case "wipe":
      f.wipe = e;
      break;
    case "typewriter":
      f.chars = clamp(p, 0, 1);
      break;
  }
  return f;
}

/** "R$ 7.899.000" -> valor animado (contagem) mantendo prefixo e formato brasileiro. */
export function countUpPrice(price: string, q: number) {
  const m = price.match(/^(\D*)([\d.,]+)(.*)$/);
  if (!m) return price;
  const [, pre, num, post] = m;
  const hasCents = /,\d{1,2}$/.test(num);
  const value = Number(num.replace(/\./g, "").replace(",", "."));
  if (!isFinite(value) || value <= 0) return price;
  const cur = value * easeOut(q);
  const txt = cur.toLocaleString("pt-BR", { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: hasCents ? 2 : 0 });
  return `${pre}${txt}${post}`;
}
