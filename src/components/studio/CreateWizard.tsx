"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clapperboard,
  Coins,
  Film,
  Info,
  Loader2,
  Minus,
  Plus,
  Sofa,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";
import { Badge, Button, Chip, inputCls } from "@/components/ui";
import { api, ApiError } from "@/lib/client";
import {
  CAMERA_MOVES,
  CREATE_MODES,
  PROMPT_SUGGESTIONS,
  ROOM_TYPES,
  STAGING_STYLES,
  VISUAL_STYLES,
  type CreateMode,
} from "@/lib/creative";
import { VIDEO_MODELS } from "@/lib/models";
import { stagingCredits, videoCredits } from "@/lib/pricing";
import type { Generation } from "@/lib/store/types";
import { ImageDrop } from "./ImageDrop";
import { useStudio } from "./StudioContext";
import { useGenerations } from "./useGenerations";

const STEPS = ["Tipo de vídeo", "Fotos", "Descrição", "Estilo visual", "Movimento", "Últimos ajustes"];
const MODE_ICONS: Record<CreateMode, typeof Wand2> = { animate: Wand2, staging: Sofa, transition: Clapperboard };

export function CreateWizard() {
  const { credits, setCredits, pricing, demo } = useStudio();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<CreateMode>("animate");
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [styleId, setStyleId] = useState("natural");
  const [cameraId, setCameraId] = useState("push-in");
  const [modelId, setModelId] = useState(VIDEO_MODELS.find((m) => m.recommended)?.id ?? VIDEO_MODELS[0].id);
  const [duration, setDuration] = useState(5);
  const [audio, setAudio] = useState(false);
  const [versions, setVersions] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Generation[] | null>(null);

  const model = VIDEO_MODELS.find((m) => m.id === modelId)!;
  const perVideo = videoCredits(model, duration, audio && model.supportsAudio, pricing);
  const total = perVideo * versions;
  const needsEnd = mode !== "animate";
  const camera = CAMERA_MOVES.find((c) => c.id === cameraId)!;
  const style = VISUAL_STYLES.find((s) => s.id === styleId)!;

  useEffect(() => {
    if (!model.durations.includes(duration)) setDuration(model.durations[0]);
    if (!model.supportsAudio) setAudio(false);
  }, [model, duration]);

  // Na transição/antes e depois a câmera parada costuma ficar melhor
  useEffect(() => {
    if (mode === "staging") setCameraId("static");
  }, [mode]);

  const canNext = [true, Boolean(start) && (!needsEnd || Boolean(end)), true, true, true, true][step];

  async function generate() {
    setSubmitting(true);
    setError("");
    try {
      const r = await api<{ generations: Generation[]; credits: number }>("/api/generate", {
        json: { mode, startImageUrl: start, endImageUrl: needsEnd ? end : null, prompt, cameraId, styleId, modelId, duration, audio, versions },
      });
      setCredits(r.credits);
      setCreated(r.generations);
    } catch (e) {
      const err = e as ApiError;
      setError(err.code === "INSUFFICIENT_CREDITS" ? "Você não tem créditos suficientes para essa geração." : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) return <Created created={created} onNew={() => { setCreated(null); setStep(0); setStart(null); setEnd(null); setPrompt(""); }} />;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pb-36 pt-8 md:px-8 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        {/* Progresso */}
        <div className="mb-8 flex gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => i < step && setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-lime-400" : "bg-white/8"} ${i < step ? "cursor-pointer hover:bg-lime-300" : "cursor-default"}`}
              aria-label={s}
            />
          ))}
        </div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">Etapa {step + 1} de {STEPS.length}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight md:text-[44px]">{STEPS[step]}</h1>

        <div className="fade-up mt-8" key={step}>
          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {CREATE_MODES.map((m) => {
                const Icon = MODE_ICONS[m.id];
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`relative flex flex-col items-start rounded-2xl border p-5 text-left transition ${active ? "border-lime-400 bg-lime-400/[0.05] glow-lime" : "border-white/8 bg-ink-900 hover:border-white/20"}`}
                  >
                    {m.badge && <span className="absolute right-4 top-4"><Badge tone="lime">{m.badge}</Badge></span>}
                    <span className={`mb-5 grid h-12 w-12 place-items-center rounded-xl ${active ? "bg-lime-400 text-black" : "bg-ink-800 text-ink-200"}`}><Icon className="h-6 w-6" /></span>
                    <span className="font-display text-lg font-bold">{m.title}</span>
                    <span className="mt-1 text-sm leading-relaxed text-ink-400">{m.subtitle}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              {mode === "staging" ? (
                <StagingStep start={start} setStart={setStart} end={end} setEnd={setEnd} />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <ImageDrop label="Primeiro quadro" sub="obrigatório" value={start} onChange={setStart} />
                  {mode === "transition" ? (
                    <ImageDrop label="Último quadro" sub="onde o vídeo termina" value={end} onChange={setEnd} />
                  ) : (
                    <div className="glass flex flex-col justify-center rounded-2xl p-6 text-sm text-ink-300">
                      <div className="mb-3 flex items-center gap-2 font-semibold text-ink-100"><Info className="h-4 w-4 text-lime-400" /> Dicas para um vídeo mais natural</div>
                      <ul className="space-y-2">
                        <li>• Use fotos na horizontal, bem iluminadas e sem distorção de grande angular exagerada.</li>
                        <li>• Uma foto por cômodo. Depois junte os clipes no Editor.</li>
                        <li>• Movimentos lentos (Avançar, Orbitar) ficam mais realistas.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="max-w-3xl">
              <p className="mb-3 text-sm text-ink-400">Opcional. Descreva algum detalhe que você quer no vídeo. Se deixar em branco, a IA mantém o imóvel exatamente como na foto.</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 800))}
                rows={5}
                placeholder="Ex.: luz do sol entrando pela janela e cortinas balançando levemente"
                className={`${inputCls} h-auto resize-none py-3 leading-relaxed`}
              />
              <div className="mt-1 text-right text-xs text-ink-500">{prompt.length}/800</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <Chip key={s} onClick={() => setPrompt((p) => (p ? `${p}, ${s}` : s))}>+ {s}</Chip>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {VISUAL_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  className={`overflow-hidden rounded-2xl border text-left transition ${styleId === s.id ? "border-lime-400 glow-lime" : "border-white/8 hover:border-white/20"}`}
                >
                  <div className="relative h-28" style={{ background: s.swatch }}>
                    {start && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={start} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity" />
                    )}
                    <div className="absolute inset-0" style={{ background: s.swatch, mixBlendMode: "soft-light" }} />
                  </div>
                  <div className="flex items-center justify-between bg-ink-900 px-4 py-3">
                    <span className="font-semibold">{s.name}</span>
                    {styleId === s.id && <Check className="h-4 w-4 text-lime-400" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {CAMERA_MOVES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCameraId(c.id)}
                  className={`overflow-hidden rounded-2xl border text-left transition ${cameraId === c.id ? "border-lime-400 glow-lime" : "border-white/8 hover:border-white/20"}`}
                >
                  <div className="relative aspect-video overflow-hidden bg-ink-800">
                    {start ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={start} alt="" className={`cam-preview ${c.css} h-full w-full object-cover`} />
                    ) : (
                      <div className={`cam-preview ${c.css} h-full w-full bg-[linear-gradient(135deg,#2a313c,#161a21)]`} />
                    )}
                  </div>
                  <div className="bg-ink-900 px-3.5 py-3">
                    <div className="flex items-center justify-between font-semibold">{c.name}{cameraId === c.id && <Check className="h-4 w-4 text-lime-400" />}</div>
                    <div className="text-xs text-ink-400">{c.hint}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8">
              <section>
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-400">1. Modelo de IA</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {VIDEO_MODELS.filter((m) => !needsEnd || m.supportsEndFrame).map((m) => {
                    const active = m.id === modelId;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setModelId(m.id)}
                        className={`flex flex-col rounded-2xl border p-4 text-left transition ${active ? "border-lime-400 bg-lime-400/[0.04] glow-lime" : "border-white/8 bg-ink-900 hover:border-white/20"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{m.name}</span>
                          {m.recommended && <Badge tone="lime">Recomendado</Badge>}
                        </div>
                        <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-ink-400">{m.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1">{m.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
                        <div className="mt-3 text-xs text-ink-300"><Coins className="mr-1 inline h-3 w-3 text-lime-400" />{videoCredits(m, 5, false, pricing)} créditos / 5s</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="glass divide-y divide-white/6 rounded-2xl">
                <Row label="Proporção" sub="Segue a proporção da foto. No Editor você escolhe 9:16, 16:9 ou 1:1.">
                  <span className="text-sm text-ink-300">Proporção da foto</span>
                </Row>
                <Row label="Duração">
                  <div className="flex flex-wrap gap-2">
                    {model.durations.map((d) => <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>{d} segundos</Chip>)}
                  </div>
                </Row>
                <Row label="Som" sub={model.supportsAudio ? "Som ambiente gerado pela IA (custa mais)." : "Este modelo não gera som."}>
                  <button
                    disabled={!model.supportsAudio}
                    onClick={() => setAudio(!audio)}
                    className={`flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition disabled:opacity-40 ${audio ? "border-lime-400 bg-lime-400/10 text-lime-300" : "border-white/10 text-ink-300"}`}
                  >
                    {audio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {audio ? "Com som" : "Sem som"}
                  </button>
                </Row>
                <Row label="Versões" sub="Gere variações e escolha a melhor. Cada versão é cobrada.">
                  <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-ink-900 p-1">
                    <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5 disabled:opacity-30" disabled={versions <= 1} onClick={() => setVersions(versions - 1)}><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center font-semibold tabular-nums">{versions}</span>
                    <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5 disabled:opacity-30" disabled={versions >= 4} onClick={() => setVersions(versions + 1)}><Plus className="h-4 w-4" /></button>
                  </div>
                </Row>
              </section>
              {demo.ai && (
                <p className="flex items-start gap-2 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 text-xs text-violet-300">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" /> Sem FAL_KEY configurada: o vídeo será simulado (zoom na foto) para você testar o fluxo. Os créditos são debitados normalmente.
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
              {start ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={start} alt="" className={`cam-preview ${camera.css} h-full w-full object-cover`} />
              ) : (
                <div className="grid h-full place-items-center text-sm text-ink-500">A prévia aparece aqui</div>
              )}
              {start && mode !== "animate" && end && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={end} alt="" className="absolute bottom-3 right-3 h-16 w-24 rounded-lg border border-white/20 object-cover shadow-xl" />
              )}
              <div className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-white/70" />
              <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-white/70" />
              <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-white/70" />
              {start && <span className="absolute left-4 top-3 ml-6 flex items-center gap-1 text-[10px] font-bold text-red-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />REC</span>}
            </div>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="lime">{CREATE_MODES.find((m) => m.id === mode)!.title}</Badge>
                <Badge>Movimento: {camera.name}</Badge>
                <Badge>{style.name}</Badge>
                <Badge>{duration}s</Badge>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-ink-500"><Info className="h-3.5 w-3.5" /> Prévia ilustrativa. O resultado real vem do modelo.</p>
            </div>
          </div>
          <div className="glass rounded-2xl p-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-ink-400">Seu saldo</span><span className="font-semibold tabular-nums">{credits} créditos</span></div>
            <div className="mt-1.5 flex items-center justify-between"><span className="text-ink-400">Este vídeo</span><span className="font-semibold tabular-nums text-lime-300">{total} créditos</span></div>
          </div>
        </div>
      </aside>

      {/* Barra inferior */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-8">
          <Button size="lg" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voltar</span></Button>
          <div className="min-w-0 flex-1 text-right">
            {error ? (
              <div className="text-sm text-red-300">
                {error} {error.includes("créditos") && <Link href="/studio/creditos" className="font-semibold text-lime-400 underline">Comprar créditos</Link>}
              </div>
            ) : (
              <div className="hidden truncate text-sm text-ink-300 md:block">
                {versions} vídeo{versions > 1 ? "s" : ""} · {duration}s · {model.name} · {camera.name}
                <div className="text-xs text-ink-500">Valor estimado em créditos. Se a IA falhar, os créditos voltam.</div>
              </div>
            )}
          </div>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="lg" disabled={!canNext} onClick={() => setStep(step + 1)}>Próximo <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button variant="primary" size="lg" loading={submitting} disabled={!start || (needsEnd && !end) || credits < total} onClick={generate} className="min-w-[200px]">
              <Sparkles className="h-4 w-4" /> GERAR
              <span className="rounded-md bg-black/15 px-2 py-0.5 text-xs tabular-nums">{total} créditos</span>
            </Button>
          )}
        </div>
        {step === STEPS.length - 1 && credits < total && !error && (
          <div className="pb-2 text-center text-xs text-amber-300">
            Saldo insuficiente ({credits}). <Link href="/studio/creditos" className="font-semibold underline">Compre créditos com Pix</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
      <div className="sm:w-56">
        <div className="font-semibold">{label}</div>
        {sub && <div className="text-xs text-ink-400">{sub}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ------------------------------------------------------------------
// Mobília virtual (dentro da etapa de fotos do modo "Antes e depois")
// ------------------------------------------------------------------
function StagingStep({ start, setStart, end, setEnd }: { start: string | null; setStart: (u: string | null) => void; end: string | null; setEnd: (u: string | null) => void }) {
  const { credits, setCredits, pricing } = useStudio();
  const [room, setRoom] = useState(ROOM_TYPES[0]);
  const [styleId, setStyleId] = useState(STAGING_STYLES[0].id);
  const [notes, setNotes] = useState("");
  const [variations, setVariations] = useState(2);
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { items, reload } = useGenerations(3000);
  const cost = stagingCredits(pricing) * variations;

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
      <h1 className="mt-2 font-display text-4xl font-extrabold">{allDone ? "Seus vídeos estão prontos" : "A IA está criando seu vídeo"}</h1>
      <p className="mt-2 text-ink-400">{allDone ? "Abra no editor para juntar os clipes, colocar música e sua marca." : "Leva de 1 a 5 minutos. Pode sair desta tela: o vídeo aparece na Galeria."}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
                  <div className="absolute inset-0 grid place-items-center"><div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur"><Loader2 className="h-4 w-4 animate-spin text-lime-400" /> Gerando...</div></div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/studio/editor"><Button variant="primary" size="lg"><Film className="h-4 w-4" /> Abrir no editor</Button></Link>
        <Link href="/studio/galeria"><Button size="lg">Ver galeria</Button></Link>
        <Button size="lg" variant="ghost" onClick={onNew}><Plus className="h-4 w-4" /> Criar outro</Button>
      </div>
    </div>
  );
}
