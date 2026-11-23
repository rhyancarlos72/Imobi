// Modelo de dados do editor (salvo como JSON em editor_projects.timeline).

export type Aspect = "9:16" | "16:9" | "1:1" | "4:5";
export type CurveId = "constant" | "impact" | "bullet" | "montage" | "flash" | "accelerate" | "decelerate" | "fast-in";
export type ImageMotion = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "none";
export type TextStyle = "title" | "caption" | "highlight";
export type TextPosition = "top" | "center" | "bottom";
export type FontId = "display" | "sans" | "serif" | "montserrat" | "bebas" | "poppins";
/** Posição livre: centro do elemento em fração da tela (0 a 1) e escala. */
export type Placement = { x: number; y: number; scale: number };
export type OverlayId = "card" | "brand" | "contact";
export type { AnimId } from "./anim";
import type { AnimId } from "./anim";

export type Clip = {
  id: string;
  kind: "video" | "image";
  src: string;
  thumb?: string | null;
  name: string;
  /** duração total do arquivo de origem (s). Para imagem = duração escolhida. */
  srcDuration: number;
  in: number;
  out: number;
  speed: number;
  curve: CurveId;
  motion: ImageMotion;
  volume: number;
  /** true quando veio de mobília virtual (mostra "Imagem ilustrativa") */
  staged?: boolean;
};

export type TextItem = {
  id: string;
  text: string;
  start: number;
  duration: number;
  style: TextStyle;
  position: TextPosition;
  font?: FontId;
  scale?: number;
  /** centro em fração da tela; null = usa a posição (topo/centro/base) */
  x?: number | null;
  y?: number | null;
  color?: string | null;
  /** animação de entrada (padrão: subir) */
  anim?: AnimId;
};

export type Music = { src: string; name: string; volume: number } | null;

export type PropertyCard = {
  enabled: boolean;
  show: "start" | "end" | "always";
  title: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  area: string;
  location: string;
  /** preço "contando" de R$ 0 até o valor final */
  countUp?: boolean;
};

export type Branding = {
  enabled: boolean;
  logo: boolean;
  whatsapp: boolean;
  creci: boolean;
};

export type Timeline = {
  version: 1;
  aspect: Aspect;
  clips: Clip[];
  texts: TextItem[];
  music: Music;
  fades: boolean;
  /** "blur": foto horizontal inteira com fundo desfocado; "cover": preenche a tela cortando */
  fit: "blur" | "cover";
  card: PropertyCard;
  branding: Branding;
  /** posição/tamanho livres do cartão, marca e faixa de contato */
  layout?: Partial<Record<OverlayId, Placement>>;
  cardFont?: FontId;
  /** animação de entrada do cartão, marca e contato */
  anims?: Partial<Record<OverlayId, AnimId>>;
};

export type BrandInfo = {
  name: string;
  color: string;
  logoUrl: string | null;
  whatsapp: string | null;
  creci: string | null;
};

export const ASPECT_SIZE: Record<Aspect, { w: number; h: number; label: string }> = {
  "9:16": { w: 1080, h: 1920, label: "Reels / TikTok" },
  "16:9": { w: 1920, h: 1080, label: "YouTube" },
  "1:1": { w: 1080, h: 1080, label: "Feed quadrado" },
  "4:5": { w: 1080, h: 1350, label: "Feed vertical" },
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function emptyTimeline(): Timeline {
  return {
    version: 1,
    aspect: "9:16",
    clips: [],
    texts: [],
    music: null,
    fades: true,
    fit: "blur",
    card: { enabled: false, show: "end", title: "", price: "", bedrooms: "", bathrooms: "", parking: "", area: "", location: "" },
    branding: { enabled: true, logo: true, whatsapp: true, creci: true },
  };
}
