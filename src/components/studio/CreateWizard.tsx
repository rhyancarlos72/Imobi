"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  Coins,
  Film,
  ImagePlus,
  Info,
  Loader2,
  Minus,
  Plus,
  Sofa,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Badge, Button, Chip, inputCls } from "@/components/ui";
import { api, ApiError, uploadFile } from "@/lib/client";
import {
  CAMERA_MOVES,
  CREATE_MODES,
  PROMPT_SUGGESTIONS,
  ROOM_TYPES,
  STAGING_STYLES,
  VISUAL_STYLES,
  type CreateMode,
} from "@/lib/creative";
import { availableVideoModels, FAMILIES, pickStagingModel, type VideoModel } from "@/lib/models";
import { stagingCredits, videoCredits } from "@/lib/pricing";
import type { Generation } from "@/lib/store/types";
import { ImageDrop } from "./ImageDrop";
import { useStudio } from "./StudioContext";
import { useGenerations } from "./useGenerations";

const STEPS = [
  { title: "O que criar", short: "Tipo" },
  { title: "Fotos do imóvel", short: "Fotos" },
  { title: "Movimento e estilo", short: "Movimento" },
  { title: "IA e finalização", short: "IA" },
];
const MODE_ICONS: Record<CreateMode, typeof Wand2> = { animate: Wand2, staging: Sofa, transition: Clapperboard };
const MAX_PHOTOS = 10;

export function CreateWizard() {
  const { credits, setCredits, pricing, demo, providers } = useStudio();
  const MODELS = useMemo(() => availableVideoModels(providers), [providers]);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<CreateMode>("animate");
  const [photos, setPhotos] = useState<string[]>([]); // modo animar: várias fotos
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [styleId, setStyleId] = useState("natural");
  const [cameraId, setCameraId] = useState("push-in");
  const [modelId, setModelId] = useState(MODELS.find((m) => m.recommended)?.id ?? MODELS[0].id);
  const [duration, setDuration] = useState(5);
  const [versions, setVersions] = useState(1);
  const [submitting, setSubmitting] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Generation[] | null>(null);

  const needsEnd = mode !== "animate";
  const usable = MODELS.filter((m) => !needsEnd || m.supportsEndFrame);
  const model = usable.find((m) => m.id === modelId) ?? usable[0];
  const sources = mode === "animate" ? photos : start ? [start] : [];
  const perVideo = videoCredits(model, duration, false, pricing);
  const count = Math.max(1, sources.length) * versions;
  const total = perVideo * count;
  const camera = CAMERA_MOVES.find((c) => c.id === cameraId)!;
  const style = VISUAL_STYLES.find((s) => s.id === styleId)!;
  const preview = sources[0] ?? null;

  useEffect(() => {
    if (model && model.id !== modelId) setModelId(model.id);
    if (model && !model.durations.includes(duration)) setDuration(model.durations[0]);
  }, [model, modelId, duration]);

  useEffect(() => {
    if (mode === "staging") setCameraId("static");
  }, [mode]);

  const photosOk = mode === "animate" ? photos.length > 0 : Boolean(start) && Boolean(end);
  const reachable = (i: number) => i === 0 || (i >= 1 && i <= 1) || photosOk;
  const canNext = step !== 1 || photosOk;

  async function generate() {
    setError("");
    setSubmitting({ done: 0, total: sources.length });
    const all: Generation[] = [];
    try {
      for (const src of sources) {
        const r = await api<{ generations: Generation[]; credits: number }>("/api/generate", {
          json: { mode, startImageUrl: src, endImageUrl: needsEnd ? end : null, prompt, cameraId, styleId, modelId: model.id, duration, audio: false, versions },
        });
        setCredits(r.credits);
        all.push(...r.generations);
        setSubmitting({ done: all.length / versions, total: sources.length });
      }
      setCreated(all);
    } catch (e) {
      const err = e as ApiError;
      const msg = err.code === "INSUFFICIENT_CREDITS" ? "Você não tem créditos suficientes para essa geração." : err.message;
      if (all.length) {
        setCreated(all); // parte já foi enviada: mostra o que deu certo
      } else setError(msg);
    } finally {
      setSubmitting(null);
    }
  }

  function reset() {
    setCreated(null);
    setStep(0);
    setPhotos([]);
    setStart(null);
    setEnd(null);
    setPrompt("");
  }

  if (created) return <Created created={created} onNew={reset} />;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pb-36 pt-6 md:px-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        {/* Etapas */}
        <ol className="mb-8 flex items-center gap-2 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            const can = reachable(i) && i !== step;
            return (
              <li key={s.title} className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => can && setStep(i)}
                  disabled={!can}
                  className={`flex h-9 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-sm font-medium transition ${
                    current ? "border-lime-400/60 bg-lime-400/10 text-white" : done ? "border-white/10 text-ink-200 hover:border-white/25" : "border-white/6 text-ink-500"
                  }`}
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${current ? "bg-lime-400 text-black" : done ? "bg-lime-400/20 text-lime-300" : "bg-white/6"}`}>
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  {s.short}
                </button>
                {i < STEPS.length - 1 && <span className={`h-px w-6 ${i < step ? "bg-lime-400/50" : "bg-white/10"}`} />}
              </li>
            );
          })}
        </ol>
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-[40px]">{STEPS[step].title}</h1>

        <div className="fade-up mt-7" key={step}>
          {/* 1. Tipo */}
          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {CREATE_MODES.map((m) => {
                const Icon = MODE_ICONS[m.id];
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id);
                      setStep(1);
                    }}
                    className={`group relative flex flex-col items-start rounded-2xl border p-5 text-left transition ${active ? "border-lime-400 bg-lime-400/[0.05] glow-lime" : "border-white/8 bg-ink-900 hover:-translate-y-0.5 hover:border-white/20"}`}
                  >
                    {m.badge && <span className="absolute right-4 top-4"><Badge tone="lime">{m.badge}</Badge></span>}
                    <span className={`mb-5 grid h-12 w-12 place-items-center rounded-xl transition ${active ? "bg-lime-400 text-black" : "bg-ink-800 text-ink-200 group-hover:bg-lime-400 group-hover:text-black"}`}><Icon className="h-6 w-6" /></span>
                    <span className="font-display text-lg font-bold">{m.title}</span>
                    <span className="mt-1 text-sm leading-relaxed text-ink-400">{m.subtitle}</span>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-lime-400 opacity-0 transition group-hover:opacity-100">Começar <ArrowRight className="h-4 w-4" /></span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Fotos */}
          {step === 1 &&
            (mode === "animate" ? (
              <MultiPhotos photos={photos} setPhotos={setPhotos} />
            ) : mode === "staging" ? (
              <StagingStep start={start} setStart={setStart} end={end} setEnd={setEnd} />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <ImageDrop label="Primeira foto" sub="onde o vídeo começa" value={start} onChange={setStart} />
                <ImageDrop label="Última foto" sub="onde o vídeo termina" value={end} onChange={setEnd} />
              </div>
            ))}

          {/* 3. Movimento e estilo */}
          {step === 2 && (
            <div className="space-y-8">
              <section>
                <SectionTitle n={1} title="Movimento de câmera" hint="A prévia usa a sua foto" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {CAMERA_MOVES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCameraId(c.id)}
                      className={`overflow-hidden rounded-2xl border text-left transition ${cameraId === c.id ? "border-lime-400 glow-lime" : "border-white/8 hover:border-white/20"}`}
                    >
                      <div className="relative aspect-video overflow-hidden bg-ink-800">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="" className={`cam-preview ${c.css} h-full w-full object-cover`} />
                        ) : (
                          <div className={`cam-preview ${c.css} h-full w-full bg-[linear-gradient(135deg,#2a313c,#161a21)]`} />
                        )}
                      </div>
                      <div className="bg-ink-900 px-3 py-2.5">
                        <div className="flex items-center justify-between text-sm font-semibold">{c.name}{cameraId === c.id && <Check className="h-4 w-4 text-lime-400" />}</div>
                        <div className="text-xs text-ink-400">{c.hint}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <SectionTitle n={2} title="Estilo de luz e cor" />
                <div className="flex flex-wrap gap-2">
                  {VISUAL_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyleId(s.id)}
                      className={`flex h-10 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-sm font-medium transition ${styleId === s.id ? "border-lime-400 bg-lime-400/10 text-lime-200" : "border-white/8 bg-ink-900 text-ink-300 hover:border-white/20"}`}
                    >
                      <span className="h-7 w-7 rounded-full border border-white/15" style={{ background: s.swatch }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <button onClick={() => setShowPrompt(!showPrompt)} className="flex items-center gap-2 text-sm font-semibold text-ink-200 hover:text-white">
                  <ChevronDown className={`h-4 w-4 transition ${showPrompt ? "" : "-rotate-90"}`} />
                  Detalhe extra para a IA <span className="font-normal text-ink-500">(opcional)</span>
                  {prompt && !showPrompt && <Badge tone="lime">preenchido</Badge>}
                </button>
                {showPrompt && (
                  <div className="mt-3 max-w-3xl">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value.slice(0, 800))}
                      rows={3}
                      placeholder="Ex.: luz do sol entrando pela janela e cortinas balançando levemente"
                      className={`${inputCls} h-auto resize-none py-3 leading-relaxed`}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {PROMPT_SUGGESTIONS.map((s) => <Chip key={s} onClick={() => setPrompt((p) => (p ? `${p}, ${s}` : s))}>+ {s}</Chip>)}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* 4. IA e finalização */}
          {step === 3 && (
            <div className="space-y-8">
              <section>
                <SectionTitle n={1} title="Escolha a inteligência artificial" hint="Você pode testar as duas no mesmo imóvel" />
                <EnginePicker models={usable} all={MODELS} value={model.id} onChange={setModelId} needsEnd={needsEnd} pricing={pricing} />
              </section>

              <section>
                <SectionTitle n={2} title="Duração e variações" />
                <div className="glass flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl p-5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-300">Duração</span>
                    {model.durations.map((d) => <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>{d}s</Chip>)}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-300">Versões por foto</span>
                    <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-ink-900 p-1">
                      <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5 disabled:opacity-30" disabled={versions <= 1} onClick={() => setVersions(versions - 1)}><Minus className="h-4 w-4" /></button>
                      <span className="w-7 text-center font-semibold tabular-nums">{versions}</span>
                      <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5 disabled:opacity-30" disabled={versions >= 3} onClick={() => setVersions(versions + 1)}><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <span className="text-xs text-ink-500">Gerar 2 versões ajuda a escolher a melhor tomada.</span>
                </div>
              </section>

              <section className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Resumo</div>
                    <div className="mt-1 text-lg font-semibold">
                      {count} {count === 1 ? "vídeo" : "vídeos"} de {duration}s · {model.name}
                    </div>
                    <div className="text-sm text-ink-400">
                      {sources.length > 1 ? `${sources.length} fotos × ${versions} ${versions > 1 ? "versões" : "versão"} × ${perVideo} créditos` : `${perVideo} créditos por vídeo`} · {camera.name} · {style.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl font-extrabold tabular-nums text-lime-300">{total}</div>
                    <div className="text-xs text-ink-400">créditos (saldo {credits})</div>
                  </div>
                </div>
              </section>

              {demo.ai && (
                <p className="flex items-start gap-2 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 text-xs text-violet-300">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" /> Sem chave de IA configurada: o vídeo será simulado para você testar o fluxo.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prévia lateral */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="relative aspect-video overflow-hidden bg-ink-850">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className={`cam-preview ${camera.css} h-full w-full object-cover`} />
              ) : (
                <div className="grid h-full place-items-center px-6 text-center text-sm text-ink-500">Envie as fotos para ver a prévia do movimento</div>
              )}
              {mode !== "animate" && end && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={end} alt="" className="absolute bottom-3 right-3 h-16 w-24 rounded-lg border border-white/20 object-cover shadow-xl" />
              )}
              {preview && <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-red-400 backdrop-blur"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />REC</span>}
              {mode === "animate" && photos.length > 1 && <span className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">+{photos.length - 1} fotos</span>}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="lime">{CREATE_MODES.find((m) => m.id === mode)!.title}</Badge>
                <Badge>{camera.name}</Badge>
                <Badge>{style.name}</Badge>
                {step >= 3 && <Badge tone="violet">{model.name}</Badge>}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-ink-500"><Info className="h-3.5 w-3.5" /> Prévia ilustrativa. O resultado vem da IA.</p>
            </div>
          </div>
          <div className="glass space-y-1.5 rounded-2xl p-4 text-sm">
            <div className="flex justify-between"><span className="text-ink-400">Seu saldo</span><span className="font-semibold tabular-nums">{credits} créditos</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Este pedido</span><span className="font-semibold tabular-nums text-lime-300">{total} créditos</span></div>
            {credits < total && <Link href="/studio/creditos" className="block pt-1 text-xs font-semibold text-amber-300 underline">Saldo insuficiente: comprar créditos</Link>}
          </div>
        </div>
      </aside>

      {/* Barra inferior */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-8">
          <Button size="lg" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || Boolean(submitting)}><ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voltar</span></Button>
          <div className="min-w-0 flex-1 text-right text-sm">
            {error ? (
              <span className="text-red-300">
                {error} {error.includes("créditos") && <Link href="/studio/creditos" className="font-semibold text-lime-400 underline">Comprar créditos</Link>}
              </span>
            ) : submitting ? (
              <span className="text-ink-300">Enviando {submitting.done + 1} de {submitting.total}…</span>
            ) : step === 0 ? (
              <span className="text-ink-500">Escolha uma opção para começar</span>
            ) : step === 1 && !photosOk ? (
              <span className="text-ink-500">{mode === "animate" ? "Envie pelo menos uma foto" : mode === "staging" ? "Envie a foto vazia e escolha o resultado mobiliado" : "Envie as duas fotos"}</span>
            ) : (
              <span className="hidden text-ink-400 md:inline">
                {count} {count === 1 ? "vídeo" : "vídeos"} · {model.name} · <b className="text-lime-300">{total} créditos</b> · se a IA falhar, os créditos voltam
              </span>
            )}
          </div>
          {step < STEPS.length - 1 ? (
            step > 0 && (
              <Button variant="primary" size="lg" disabled={!canNext} onClick={() => setStep(step + 1)}>
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            )
          ) : (
            <Button variant="primary" size="lg" loading={Boolean(submitting)} disabled={!photosOk || credits < total} onClick={generate} className="min-w-[210px]">
              <Sparkles className="h-4 w-4" /> Gerar {count > 1 ? `${count} vídeos` : "vídeo"}
              <span className="rounded-md bg-black/15 px-2 py-0.5 text-xs tabular-nums">{total}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/8 text-xs font-bold text-ink-200">{n}</span>
        {title}
      </h2>
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </div>
  );
}

function Meter({ value, label }: { value: 1 | 2 | 3; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-ink-400">{label}</span>
      <span className="flex gap-1">
        {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-5 rounded-full ${i <= value ? "bg-lime-400" : "bg-white/10"}`} />)}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------
// Seletor Seedance x Kling
// ------------------------------------------------------------------
function EnginePicker({
  models,
  all,
  value,
  onChange,
  needsEnd,
  pricing,
}: {
  models: VideoModel[];
  all: VideoModel[];
  value: string;
  onChange: (id: string) => void;
  needsEnd: boolean;
  pricing: Parameters<typeof videoCredits>[3];
}) {
  const current = models.find((m) => m.id === value) ?? models[0];
  const families = FAMILIES.filter((f) => all.some((m) => m.family === f.id));
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {families.map((f) => {
          const variants = models.filter((m) => m.family === f.id);
          const disabled = variants.length === 0;
          const active = current.family === f.id;
          const cheapest = Math.min(...(variants.length ? variants : all.filter((m) => m.family === f.id)).map((m) => videoCredits(m, 5, false, pricing)));
          return (
            <button
              key={f.id}
              disabled={disabled}
              onClick={() => onChange((variants.find((m) => m.recommended) ?? variants[0]).id)}
              className={`relative rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${active ? "border-lime-400 bg-lime-400/[0.05] glow-lime" : "border-white/8 bg-ink-900 hover:border-white/20"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-2xl font-bold">{f.name}</div>
                  <div className="text-xs text-ink-500">por {f.maker}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-400">a partir de</div>
                  <div className="font-semibold tabular-nums text-lime-300"><Coins className="mr-1 inline h-3.5 w-3.5" />{cheapest} créditos</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-300">{f.pitch}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">{f.strengths.map((s) => <Badge key={s}>{s}</Badge>)}</ul>
              {disabled && needsEnd && <p className="mt-3 text-xs text-amber-300">Não disponível neste tipo de vídeo (precisa de primeira e última foto). Use em “Animar foto”.</p>}
              {active && <span className="absolute -top-2.5 right-4 grid h-6 w-6 place-items-center rounded-full bg-lime-400 text-black"><Check className="h-4 w-4" strokeWidth={3} /></span>}
            </button>
          );
        })}
      </div>

      {/* Variantes da família escolhida */}
      <div className="grid gap-3 sm:grid-cols-2">
        {models
          .filter((m) => m.family === current.family)
          .map((m) => {
            const active = m.id === current.id;
            return (
              <button key={m.id} onClick={() => onChange(m.id)} className={`rounded-xl border p-4 text-left transition ${active ? "border-lime-400/70 bg-lime-400/[0.04]" : "border-white/8 bg-ink-900 hover:border-white/20"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className={`grid h-4 w-4 place-items-center rounded-full border ${active ? "border-lime-400 bg-lime-400" : "border-white/25"}`}>{active && <span className="h-1.5 w-1.5 rounded-full bg-black" />}</span>
                    {m.name}
                  </span>
                  {m.recommended ? <Badge tone="lime"><Zap className="h-3 w-3" /> Recomendado</Badge> : <span className="text-sm tabular-nums text-ink-300">{videoCredits(m, 5, false, pricing)} cr / 5s</span>}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{m.description}</p>
                <div className="mt-3 space-y-1.5">
                  <Meter value={m.quality} label="Qualidade" />
                  <Meter value={m.speed} label="Velocidade" />
                </div>
                {m.recommended && <div className="mt-2 text-right text-xs tabular-nums text-ink-300">{videoCredits(m, 5, false, pricing)} créditos / 5s</div>}
              </button>
            );
          })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Várias fotos (Animar foto): cada foto vira um vídeo
// ------------------------------------------------------------------
function MultiPhotos({ photos, setPhotos }: { photos: string[]; setPhotos: (fn: (p: string[]) => string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  async function add(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const room = MAX_PHOTOS - photos.length;
    if (!list.length) return setError("Envie imagens (JPG, PNG ou WebP).");
    if (list.length > room) setError(`Máximo de ${MAX_PHOTOS} fotos por vez.`);
    else setError("");
    const take = list.slice(0, Math.max(0, room));
    setBusy((n) => n + take.length);
    await Promise.all(
      take.map(async (f) => {
        try {
          const r = await uploadFile(f);
          setPhotos((p) => [...p, r.url]);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy((n) => n - 1);
        }
      }),
    );
  }

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-ink-400">
        Envie uma foto por cômodo (até {MAX_PHOTOS}). <b className="text-ink-200">Cada foto vira um vídeo</b> com o mesmo movimento e estilo, gerados ao mesmo tempo. Depois você junta tudo no editor.
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        className={`grid grid-cols-2 gap-3 rounded-3xl border-2 border-dashed p-3 transition sm:grid-cols-3 xl:grid-cols-4 ${drag ? "border-lime-400 bg-lime-400/5" : "border-white/10"}`}
      >
        {photos.map((url, i) => (
          <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-bold backdrop-blur">{i + 1}</span>
            <button onClick={() => setPhotos((p) => p.filter((x) => x !== url))} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-black/60 opacity-0 backdrop-blur transition hover:bg-red-500 group-hover:opacity-100" title="Remover">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`b${i}`} className="shimmer grid aspect-[4/3] place-items-center rounded-2xl"><Loader2 className="h-6 w-6 animate-spin text-lime-400" /></div>
        ))}
        {photos.length + busy < MAX_PHOTOS && (
          <button onClick={() => input.current?.click()} className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl bg-ink-900 text-center transition hover:bg-ink-800">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 text-ink-300 transition group-hover:bg-lime-400 group-hover:text-black"><ImagePlus className="h-5 w-5" /></span>
            <span className="text-sm font-medium text-ink-200">{photos.length ? "Adicionar mais" : "Arraste as fotos ou clique"}</span>
            <span className="text-xs text-ink-500">JPG, PNG ou WebP</span>
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-amber-300">{error}</p>}
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

// ------------------------------------------------------------------
// Mobília virtual (dentro da etapa de fotos do modo "Antes e depois")
// ------------------------------------------------------------------
function StagingStep({ start, setStart, end, setEnd }: { start: string | null; setStart: (u: string | null) => void; end: string | null; setEnd: (u: string | null) => void }) {
  const { credits, setCredits, pricing, providers } = useStudio();
  const [room, setRoom] = useState(ROOM_TYPES[0]);
  const [styleId, setStyleId] = useState(STAGING_STYLES[0].id);
  const [notes, setNotes] = useState("");
  const [variations, setVariations] = useState(2);
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { items, reload } = useGenerations(3000);
  const cost = stagingCredits(pricing, pickStagingModel(providers)) * variations;

  const results = useMemo(() => (items ?? []).filter((g) => ids.includes(g.id)), [items, ids]);

  async function stage() {
    if (!start) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ generations: Generation[]; credits: number }>("/api/staging", { json: { imageUrl: start, room, styleId, notes, variations } });
      setCredits(r.credits);
      setIds(r.generations.map((g) => g.id));
      setEnd(null);
      reload();
    } catch (e) {
      const err = e as ApiError;
      setError(err.code === "INSUFFICIENT_CREDITS" ? "Créditos insuficientes." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-5">
        <ImageDrop label="1. Foto do cômodo vazio" sub="antes" value={start} onChange={(u) => { setStart(u); setEnd(null); setIds([]); }} />
        <div className="glass space-y-4 rounded-2xl p-5">
          <div className="text-sm font-semibold">2. Como mobiliar</div>
          <div>
            <div className="mb-2 text-xs text-ink-400">Cômodo</div>
            <div className="flex flex-wrap gap-2">{ROOM_TYPES.map((r) => <Chip key={r} active={room === r} onClick={() => setRoom(r)}>{r}</Chip>)}</div>
          </div>
          <div>
            <div className="mb-2 text-xs text-ink-400">Estilo da decoração</div>
            <div className="flex flex-wrap gap-2">{STAGING_STYLES.map((s) => <Chip key={s.id} active={styleId === s.id} onClick={() => setStyleId(s.id)}>{s.name}</Chip>)}</div>
          </div>
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pedido do cliente (opcional): sofá em L cinza, painel ripado atrás da TV..." />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-ink-300">
              Opções:
              {[1, 2, 3].map((n) => <Chip key={n} active={variations === n} onClick={() => setVariations(n)}>{n}</Chip>)}
            </div>
            <Button variant="primary" onClick={stage} loading={busy} disabled={!start || credits < cost}>
              <Sofa className="h-4 w-4" /> Mobiliar com IA · {cost} créditos
            </Button>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">3. Escolha o resultado (depois)</span>
          <span className="text-xs text-ink-400">vira o último quadro do vídeo</span>
        </div>
        {results.length ? (
          <div className="grid grid-cols-2 gap-3">
            {results.map((g) => (
              <button
                key={g.id}
                disabled={g.status !== "completed"}
                onClick={() => g.output_url && setEnd(g.output_url)}
                className={`relative aspect-[4/3] overflow-hidden rounded-2xl border-2 transition ${end && end === g.output_url ? "border-lime-400 glow-lime" : "border-transparent"}`}
              >
                {g.status === "completed" && g.output_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.output_url} alt="" className="h-full w-full object-cover" />
                ) : g.status === "failed" ? (
                  <div className="grid h-full place-items-center bg-red-500/5 p-3 text-center text-xs text-red-300">Falhou — créditos devolvidos</div>
                ) : (
                  <div className="shimmer grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-lime-400" /></div>
                )}
                {end && end === g.output_url && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-lime-400 text-black"><Check className="h-4 w-4" strokeWidth={3} /></span>}
              </button>
            ))}
          </div>
        ) : (
          <ImageDrop label="" value={end} onChange={setEnd} aspect="aspect-[4/3]" />
        )}
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Já tem a foto mobiliada? Envie direto. Nos vídeos com mobília virtual o editor adiciona o aviso “Imagem ilustrativa”.
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Tela após gerar
// ------------------------------------------------------------------
function Created({ created, onNew }: { created: Generation[]; onNew: () => void }) {
  const { items } = useGenerations(4000);
  const list = created.map((c) => items?.find((g) => g.id === c.id) ?? c);
  const allDone = list.every((g) => g.status === "completed" || g.status === "failed");
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">{allDone ? "Pronto" : "Gerando"}</div>
      <h1 className="mt-2 font-display text-4xl font-extrabold">{allDone ? (list.length > 1 ? "Seus vídeos estão prontos" : "Seu vídeo está pronto") : list.length > 1 ? `A IA está criando ${list.length} vídeos` : "A IA está criando seu vídeo"}</h1>
      {!allDone && (
        <div className="mt-4 h-1.5 max-w-md overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-lime-400 transition-all" style={{ width: `${Math.round((list.filter((g) => g.status === "completed" || g.status === "failed").length / list.length) * 100)}%` }} />
        </div>
      )}
      <p className="mt-2 text-ink-400">{allDone ? "Abra no editor para juntar os clipes, colocar música e sua marca." : "Normalmente leva de 2 a 6 minutos, dependendo da fila da IA. Pode sair desta tela: o vídeo aparece na Galeria e os créditos voltam se algo falhar."}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <div key={g.id} className="glass overflow-hidden rounded-2xl">
            <div className="relative aspect-video bg-ink-850">
              {g.status === "completed" && g.output_url ? (
                <video src={g.output_url} className="h-full w-full object-cover" autoPlay muted loop playsInline controls />
              ) : g.status === "failed" ? (
                <div className="grid h-full place-items-center p-4 text-center text-sm text-red-300">Não foi possível gerar. Os créditos foram devolvidos.<br />{g.error}</div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {g.thumbnail_url && <img src={g.thumbnail_url} alt="" className="h-full w-full object-cover opacity-40 blur-[2px]" />}
                  <div className="absolute inset-0 grid place-items-center"><div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur"><Loader2 className="h-4 w-4 animate-spin text-lime-400" /> Gerando… <Elapsed since={g.created_at} /></div></div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {(() => {
          const ready = list.filter((g) => g.status === "completed").map((g) => g.id);
          return ready.length ? (
            <Link href={`/studio/editor?gens=${ready.join(",")}`}><Button variant="primary" size="lg"><Film className="h-4 w-4" /> Montar vídeo no editor ({ready.length})</Button></Link>
          ) : (
            <Button variant="primary" size="lg" disabled><Film className="h-4 w-4" /> Montar vídeo no editor</Button>
          );
        })()}
        <Link href="/studio/galeria"><Button size="lg">Ver galeria</Button></Link>
        <Button size="lg" variant="ghost" onClick={onNew}><Plus className="h-4 w-4" /> Criar outro</Button>
      </div>
    </div>
  );
}

/** Cronômetro para o cliente ver que a geração está andando. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  return <span className="tabular-nums text-ink-300">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}
