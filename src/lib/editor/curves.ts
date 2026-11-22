// Curvas de velocidade (speed ramp). f(u) = multiplicador de velocidade ao longo
// do clipe, com u de 0 a 1 = progresso no arquivo de origem.
import type { Clip, CurveId } from "./types";

const gauss = (u: number, c: number, w: number) => Math.exp(-((u - c) ** 2) / (2 * w * w));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

export const CURVES: { id: CurveId; name: string; f: (u: number) => number }[] = [
  { id: "constant", name: "Constante", f: () => 1 },
  { id: "impact", name: "Impacto", f: (u) => (u < 0.55 ? lerp(2.2, 0.4, smooth(u / 0.55)) : lerp(0.4, 1.1, smooth((u - 0.55) / 0.45))) },
  { id: "bullet", name: "Bullet time", f: (u) => 1.6 - 1.25 * gauss(u, 0.5, 0.16) },
  { id: "montage", name: "Montagem", f: (u) => 0.8 + 1.5 * gauss(u, 0.5, 0.18) },
  { id: "flash", name: "Flash", f: (u) => 1 + 3 * gauss(u, 0.5, 0.06) },
  { id: "accelerate", name: "Acelerar", f: (u) => lerp(0.6, 2.2, smooth(u)) },
  { id: "decelerate", name: "Desacelerar", f: (u) => lerp(2.2, 0.6, smooth(u)) },
  { id: "fast-in", name: "Entrada rápida", f: (u) => (u < 0.3 ? 2.6 : lerp(2.6, 1, smooth(Math.min(1, (u - 0.3) / 0.25)))) },
];

export function curveFn(id: CurveId) {
  return (CURVES.find((c) => c.id === id) ?? CURVES[0]).f;
}

/** Caminho SVG da curva para os cartões do inspector (viewBox 0 0 100 40). */
export function curvePath(id: CurveId) {
  const f = curveFn(id);
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const v = Math.min(4, f(u));
    const y = 36 - ((v - 0.3) / 3.7) * 32;
    pts.push(`${i === 0 ? "M" : "L"}${(u * 100).toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

const N = 120;
export type ClipLUT = { duration: number; t: Float32Array };

/** Tabela tempo-de-saída -> progresso u. Calculada uma vez por clipe. */
export function buildLUT(clip: Clip): ClipLUT {
  const f = curveFn(clip.curve);
  const srcLen = Math.max(0.05, clip.out - clip.in);
  const t = new Float32Array(N + 1);
  let acc = 0;
  for (let i = 1; i <= N; i++) {
    const um = (i - 0.5) / N;
    acc += srcLen / N / Math.max(0.05, clip.speed * f(um));
    t[i] = acc;
  }
  return { duration: acc, t };
}

/** Converte tempo local de saída (s) em progresso u (0..1). */
export function uAt(lut: ClipLUT, local: number) {
  if (local <= 0) return 0;
  if (local >= lut.duration) return 1;
  let lo = 0;
  let hi = N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (lut.t[mid] <= local) lo = mid;
    else hi = mid;
  }
  const span = lut.t[hi] - lut.t[lo] || 1;
  return (lo + (local - lut.t[lo]) / span) / N;
}

/** Tempo local de saída correspondente ao progresso u. */
export function localAt(lut: ClipLUT, u: number) {
  const x = Math.max(0, Math.min(1, u)) * N;
  const i = Math.floor(x);
  if (i >= N) return lut.duration;
  return lut.t[i] + (lut.t[i + 1] - lut.t[i]) * (x - i);
}

export function speedAt(clip: Clip, u: number) {
  return clip.speed * curveFn(clip.curve)(u);
}
