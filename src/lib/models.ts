// Catálogo de modelos de IA (via fal.ai). Pode ser importado no navegador.
//
// IMPORTANTE: preços (usdPerSecond / usdPerImage) e nomes de parâmetros mudam.
// Antes de ir para produção confira cada endpoint em https://fal.ai/models/<endpoint>
// (aba "API" mostra o schema e a aba "Pricing" o preço atual) e ajuste aqui.

export type VideoModel = {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  tags: string[];
  recommended?: boolean;
  /** Custo estimado no fal.ai, em dólares por segundo de vídeo. */
  usdPerSecond: number;
  /** Custo extra por segundo quando o som está ligado (se o modelo cobra diferente). */
  usdPerSecondAudio?: number;
  durations: number[];
  supportsEndFrame: boolean;
  supportsAudio: boolean;
  /** Nomes dos campos de entrada no schema do fal. */
  fields: {
    start: string;
    end?: string;
    duration: string;
    durationAsString?: boolean;
    audio?: string;
    extra?: Record<string, unknown>;
  };
};

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "seedance-2",
    name: "Seedance 2.0",
    description: "Movimento de câmera muito natural, ótimo para tour de imóvel. Aceita primeiro e último quadro.",
    endpoint: "bytedance/seedance-2.0/image-to-video",
    tags: ["Quadros", "Áudio", "1080p"],
    usdPerSecond: 0.25,
    usdPerSecondAudio: 0.3034,
    durations: [5, 10],
    supportsEndFrame: true,
    supportsAudio: true,
    fields: { start: "image_url", end: "end_image_url", duration: "duration", durationAsString: true, audio: "generate_audio", extra: { resolution: "720p" } },
  },
  {
    id: "seedance-2-fast",
    name: "Seedance 2.0 Fast",
    description: "Mesma qualidade de movimento, mais rápido e mais barato (até 720p).",
    endpoint: "bytedance/seedance-2.0/fast/image-to-video",
    tags: ["Rápido", "Quadros", "Econômico"],
    recommended: true,
    usdPerSecond: 0.2,
    usdPerSecondAudio: 0.242,
    durations: [5, 10],
    supportsEndFrame: true,
    supportsAudio: true,
    fields: { start: "image_url", end: "end_image_url", duration: "duration", durationAsString: true, audio: "generate_audio", extra: { resolution: "720p" } },
  },
  {
    id: "seedance-2-5-flash",
    name: "Seedance 2.5 Flash",
    description: "Geração nova e veloz da ByteDance, boa para volume de vídeos.",
    endpoint: "bytedance/seedance-2.5/flash/image-to-video",
    tags: ["Rápido", "Quadros"],
    usdPerSecond: 0.2,
    durations: [5, 10],
    supportsEndFrame: true,
    supportsAudio: false,
    fields: { start: "image_url", end: "end_image_url", duration: "duration", durationAsString: true },
  },
  {
    id: "kling-3-pro",
    name: "Kling 3.0 Pro",
    description: "Visual cinematográfico, ótimo para imóveis de alto padrão. Áudio nativo.",
    endpoint: "fal-ai/kling-video/v3/pro/image-to-video",
    tags: ["Cinema", "Áudio", "Quadros"],
    usdPerSecond: 0.3,
    durations: [5, 10],
    supportsEndFrame: true,
    supportsAudio: true,
    fields: { start: "start_image_url", end: "end_image_url", duration: "duration", durationAsString: true, audio: "generate_audio" },
  },
];

export type ImageModel = {
  id: string;
  name: string;
  endpoint: string;
  usdPerImage: number;
};

/** Modelo usado na mobília virtual (foto vazia -> foto mobiliada). */
export const STAGING_MODEL: ImageModel = {
  id: "nano-banana-pro-edit",
  name: "Nano Banana Pro",
  endpoint: "fal-ai/nano-banana-pro/edit",
  usdPerImage: 0.15,
};

export function getVideoModel(id: string) {
  return VIDEO_MODELS.find((m) => m.id === id);
}
