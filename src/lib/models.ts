// Catálogo de modelos de IA. Pode ser importado no navegador.
//
// Provedores:
//  - "kie": Kie.ai (principal, mais barato)   https://docs.kie.ai
//  - "fal": fal.ai (alternativa)               https://fal.ai/models
//
// IMPORTANTE: preços (usdPerSecond / usdPerImage) e nomes de parâmetros mudam.
// Confira na documentação do provedor antes de ir para produção e ajuste aqui.

export type Provider = "kie" | "fal";

export type ModelFamily = "seedance" | "kling";

export type VideoModel = {
  id: string;
  name: string;
  /** Família (para o seletor Seedance x Kling) e nome curto da variante. */
  family: ModelFamily;
  variant: string;
  /** Notas de 1 a 3 para a comparação na tela. */
  quality: 1 | 2 | 3;
  speed: 1 | 2 | 3;
  description: string;
  provider: Provider;
  /** Nome do modelo/endpoint no provedor. */
  endpoint: string;
  tags: string[];
  recommended?: boolean;
  /** Custo estimado no provedor, em dólares por segundo de vídeo (720p). */
  usdPerSecond: number;
  /** Custo por segundo com som ligado (se o modelo cobra diferente). */
  usdPerSecondAudio?: number;
  durations: number[];
  supportsEndFrame: boolean;
  supportsAudio: boolean;
  /** Nomes dos campos de entrada no schema do provedor. */
  fields: {
    start: string;
    /** true: a foto vai dentro de uma lista (ex.: image_urls: [url]) */
    startIsArray?: boolean;
    end?: string;
    duration: string;
    durationAsString?: boolean;
    audio?: string;
    extra?: Record<string, unknown>;
  };
};

export const VIDEO_MODELS: VideoModel[] = [
  // ------------------------------------------------------------------ Kie.ai
  {
    id: "kie-seedance-2-fast",
    name: "Seedance 2.0 Fast",
    family: "seedance",
    variant: "Fast",
    quality: 2,
    speed: 3,
    description: "Movimento de câmera natural, rápido e econômico. O melhor custo-benefício para imóveis.",
    provider: "kie",
    endpoint: "bytedance/seedance-2-fast",
    tags: ["Econômico", "Quadros", "720p"],
    recommended: true,
    usdPerSecond: 0.124,
    durations: [5, 10],
    supportsEndFrame: true,
    supportsAudio: false,
    fields: { start: "first_frame_url", end: "last_frame_url", duration: "duration", audio: "generate_audio", extra: { resolution: "720p", generate_audio: false } },
  },
  {
    id: "kie-seedance-2",
    name: "Seedance 2.0",
    family: "seedance",
    variant: "Pro",
    quality: 3,
    speed: 2,
    description: "Versão completa do Seedance: mais detalhe e movimento ainda mais suave. Ideal para alto padrão.",
    provider: "kie",
    endpoint: "bytedance/seedance-2",
    tags: ["Alto padrão", "Quadros", "720p"],
    usdPerSecond: 0.205,
    durations: [5, 10],
    supportsEndFrame: true,
    supportsAudio: false,
    fields: { start: "first_frame_url", end: "last_frame_url", duration: "duration", audio: "generate_audio", extra: { resolution: "720p", generate_audio: false } },
  },
  {
    id: "kie-kling-3",
    name: "Kling 3.0",
    family: "kling",
    variant: "Standard",
    quality: 2,
    speed: 3,
    description: "Visual cinematográfico com ótimo preço. Anima a partir de uma foto.",
    provider: "kie",
    endpoint: "kling-3.0/video",
    tags: ["Cinema", "Econômico", "720p"],
    usdPerSecond: 0.08,
    durations: [5, 10],
    supportsEndFrame: false,
    supportsAudio: false,
    fields: { start: "image_urls", startIsArray: true, duration: "duration", durationAsString: true, extra: { mode: "std", sound: false, multi_shots: false } },
  },
  {
    id: "kie-kling-3-pro",
    name: "Kling 3.0 Pro",
    family: "kling",
    variant: "Pro",
    quality: 3,
    speed: 2,
    description: "Kling em 1080p, com mais nitidez e detalhes. Ótimo para alto padrão.",
    provider: "kie",
    endpoint: "kling-3.0/video",
    tags: ["1080p", "Cinema"],
    usdPerSecond: 0.101,
    durations: [5, 10],
    supportsEndFrame: false,
    supportsAudio: false,
    fields: { start: "image_urls", startIsArray: true, duration: "duration", durationAsString: true, extra: { mode: "pro", sound: false, multi_shots: false } },
  },

  // ------------------------------------------------------------------ fal.ai
  {
    id: "seedance-2-fast",
    name: "Seedance 2.0 Fast (fal)",
    family: "seedance",
    variant: "Fast (fal)",
    quality: 2,
    speed: 3,
    description: "Seedance Fast pelo fal.ai.",
    provider: "fal",
    endpoint: "bytedance/seedance-2.0/fast/image-to-video",
    tags: ["Rápido", "Quadros"],
    usdPerSecond: 0.2419,
    durations: [5, 10],
    supportsEndFrame: true,
    supportsAudio: false,
    fields: { start: "image_url", end: "end_image_url", duration: "duration", durationAsString: true, extra: { resolution: "720p" } },
  },
  {
    id: "seedance-2",
    name: "Seedance 2.0 (fal)",
    family: "seedance",
    variant: "Pro (fal)",
    quality: 3,
    speed: 2,
    description: "Seedance completo pelo fal.ai.",
    provider: "fal",
    endpoint: "bytedance/seedance-2.0/image-to-video",
    tags: ["Quadros", "1080p"],
    usdPerSecond: 0.3034,
    durations: [5, 10],
    supportsEndFrame: true,
    supportsAudio: false,
    fields: { start: "image_url", end: "end_image_url", duration: "duration", durationAsString: true, extra: { resolution: "720p" } },
  },
];

export type ImageModel = {
  id: string;
  name: string;
  provider: Provider;
  endpoint: string;
  usdPerImage: number;
};

/** Modelos de mobília virtual (foto vazia -> foto mobiliada), em ordem de preferência. */
export const STAGING_MODELS: ImageModel[] = [
  { id: "kie-nano-banana-edit", name: "Nano Banana", provider: "kie", endpoint: "google/nano-banana-edit", usdPerImage: 0.02 },
  { id: "nano-banana-pro-edit", name: "Nano Banana Pro (fal)", provider: "fal", endpoint: "fal-ai/nano-banana-pro/edit", usdPerImage: 0.15 },
];

/** Usado só para exibir preço quando não se sabe o provedor. */
export const STAGING_MODEL: ImageModel = STAGING_MODELS[0];

export function getVideoModel(id: string) {
  return VIDEO_MODELS.find((m) => m.id === id);
}

export function availableVideoModels(providers: Record<Provider, boolean>) {
  const any = providers.kie || providers.fal;
  // no modo demonstração (nenhum provedor), mostra só os do Kie para não duplicar
  return VIDEO_MODELS.filter((m) => (any ? providers[m.provider] : m.provider === "kie"));
}

export function pickStagingModel(providers: Record<Provider, boolean>) {
  return STAGING_MODELS.find((m) => providers[m.provider]) ?? STAGING_MODELS[0];
}

export const FAMILIES: { id: ModelFamily; name: string; maker: string; pitch: string; strengths: string[] }[] = [
  {
    id: "seedance",
    name: "Seedance",
    maker: "ByteDance",
    pitch: "Movimento de câmera mais natural, parece um drone de verdade.",
    strengths: ["Tour pelo imóvel", "Antes e depois", "Transição entre fotos"],
  },
  {
    id: "kling",
    name: "Kling",
    maker: "Kuaishou",
    pitch: "Visual cinematográfico e o menor preço por vídeo.",
    strengths: ["Fachadas e áreas externas", "Mais vídeos por crédito", "Alto padrão (Pro)"],
  },
];
