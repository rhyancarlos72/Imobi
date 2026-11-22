// Opções criativas do assistente "Criar": modos, movimentos de câmera,
// estilos visuais e estilos de mobília. Os prompts vão em inglês porque os
// modelos de vídeo respondem melhor assim.

export type CreateMode = "animate" | "staging" | "transition";

export const CREATE_MODES: { id: CreateMode; title: string; subtitle: string; badge?: string }[] = [
  { id: "animate", title: "Animar foto", subtitle: "Uma foto vira um vídeo com movimento de câmera, como um drone passeando pelo imóvel." },
  { id: "staging", title: "Antes e depois", subtitle: "O cômodo vazio vai sendo mobiliado no vídeo. A IA cria a mobília para você.", badge: "Mais vendido" },
  { id: "transition", title: "Transição entre fotos", subtitle: "Envie duas fotos e a IA cria o movimento que liga uma à outra." },
];

export type CameraMove = { id: string; name: string; hint: string; prompt: string; css: string };

export const CAMERA_MOVES: CameraMove[] = [
  { id: "push-in", name: "Avançar", hint: "Zoom lento para dentro", prompt: "slow smooth dolly push-in camera movement moving forward into the space", css: "cam-push-in" },
  { id: "pull-out", name: "Recuar", hint: "Abre o plano devagar", prompt: "slow smooth dolly pull-out camera movement revealing the whole space", css: "cam-pull-out" },
  { id: "pan-left", name: "Panorâmica esq.", hint: "Gira para a esquerda", prompt: "slow horizontal pan from right to left across the room", css: "cam-pan-left" },
  { id: "pan-right", name: "Panorâmica dir.", hint: "Gira para a direita", prompt: "slow horizontal pan from left to right across the room", css: "cam-pan-right" },
  { id: "orbit", name: "Orbitar", hint: "Arco suave ao redor", prompt: "smooth arc orbit camera movement around the center of the space, parallax", css: "cam-orbit" },
  { id: "crane-up", name: "Drone subindo", hint: "Sobe revelando o imóvel", prompt: "aerial drone shot slowly rising upward revealing the property", css: "cam-crane-up" },
  { id: "fpv", name: "Tour FPV", hint: "Drone entrando na casa", prompt: "fpv drone flythrough gliding forward through the house, steady and smooth", css: "cam-fpv" },
  { id: "static", name: "Câmera fixa", hint: "Só a cena se mexe", prompt: "static locked-off camera, subtle natural motion in the scene only", css: "cam-static" },
];

export type VisualStyle = { id: string; name: string; prompt: string; swatch: string };

export const VISUAL_STYLES: VisualStyle[] = [
  { id: "natural", name: "Natural", prompt: "photorealistic, true-to-life colors, natural daylight", swatch: "linear-gradient(135deg,#e8e2d6,#b9c7b0)" },
  { id: "cinematic", name: "Cinematográfico", prompt: "cinematic real estate film look, soft contrast, gentle film grain", swatch: "linear-gradient(135deg,#1f2a36,#c08a52)" },
  { id: "luxury", name: "Luxo quente", prompt: "warm luxurious ambience, golden accent lighting, premium architectural photography", swatch: "linear-gradient(135deg,#3a2a1a,#e2b46b)" },
  { id: "bright", name: "Claro e clean", prompt: "bright airy interior, clean whites, high-key lighting", swatch: "linear-gradient(135deg,#ffffff,#dfe9f2)" },
  { id: "golden", name: "Pôr do sol", prompt: "golden hour sunlight streaming through the windows, long soft shadows", swatch: "linear-gradient(135deg,#ffb36b,#ff6f61)" },
  { id: "night", name: "Noite aconchegante", prompt: "cozy evening ambience, warm interior lights on, blue hour outside", swatch: "linear-gradient(135deg,#0d1b3d,#f0a85a)" },
];

export const ROOM_TYPES = ["Sala de estar", "Quarto", "Cozinha", "Sala de jantar", "Varanda", "Escritório", "Banheiro", "Área gourmet"];

export const STAGING_STYLES: { id: string; name: string; prompt: string }[] = [
  { id: "modern", name: "Moderno", prompt: "modern contemporary furniture, neutral palette, wood and linen textures" },
  { id: "minimal", name: "Minimalista", prompt: "minimalist furniture, clean lines, few carefully chosen pieces" },
  { id: "scandi", name: "Escandinavo", prompt: "scandinavian style, light oak wood, soft whites, cozy textiles, plants" },
  { id: "industrial", name: "Industrial", prompt: "industrial loft style, leather, black metal, warm wood" },
  { id: "luxury", name: "Alto padrão", prompt: "high-end luxury furniture, marble, brass details, designer lighting" },
  { id: "beach", name: "Praiano", prompt: "coastal beach house style, rattan, light linen, blue and sand tones" },
  { id: "rustic", name: "Rústico", prompt: "rustic farmhouse style, natural wood, stone, warm earthy tones" },
  { id: "classic", name: "Clássico", prompt: "classic elegant furniture, moldings, rich fabrics, timeless decor" },
];

export const PROMPT_SUGGESTIONS = [
  "luz natural entrando pela janela",
  "cortinas balançando levemente",
  "reflexo suave no piso",
  "água da piscina se movendo",
  "folhas das plantas com brisa",
  "luzes da cozinha acendendo",
];

const BASE_GUARDRAILS =
  "Real estate marketing video. Keep the architecture, layout, materials and proportions exactly as in the photo. Realistic, stabilized, smooth motion. No people, no text, no logos, no distortion.";

export function buildVideoPrompt(opts: {
  mode: CreateMode;
  cameraId: string;
  styleId: string;
  userPrompt?: string;
}) {
  const cam = CAMERA_MOVES.find((c) => c.id === opts.cameraId) ?? CAMERA_MOVES[0];
  const style = VISUAL_STYLES.find((s) => s.id === opts.styleId);
  const parts: string[] = [];
  if (opts.mode === "staging") {
    parts.push(
      "The empty room gradually becomes furnished: each piece of furniture and decor smoothly appears in place, one after another, ending exactly on the final furnished frame.",
    );
  } else if (opts.mode === "transition") {
    parts.push("Seamless continuous camera move from the first image to the final image.");
  }
  parts.push(cam.prompt + ".");
  if (style) parts.push(style.prompt + ".");
  if (opts.userPrompt?.trim()) parts.push(`Details (Portuguese, from the user): ${opts.userPrompt.trim()}.`);
  parts.push(BASE_GUARDRAILS);
  return parts.join(" ");
}

export function buildStagingPrompt(opts: { room: string; styleId: string; notes?: string }) {
  const style = STAGING_STYLES.find((s) => s.id === opts.styleId) ?? STAGING_STYLES[0];
  return [
    `Virtually stage this empty ${opts.room} (room type in Portuguese) with ${style.prompt}.`,
    "Keep walls, windows, floor, ceiling, doors, lighting and camera angle exactly the same. Only add furniture, rugs, decor and plants with realistic scale, shadows and reflections.",
    "Photorealistic professional real estate photography.",
    opts.notes?.trim() ? `Extra wishes from the client (Portuguese): ${opts.notes.trim()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
