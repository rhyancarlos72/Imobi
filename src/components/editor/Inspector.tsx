"use client";
import { Copy, Gem, Music2, Rocket, Scissors, Trash2, Tv, X } from "lucide-react";
import type { ReactNode } from "react";
import { CURVES, curvePath } from "@/lib/editor/curves";
import { ASPECT_SIZE, type Aspect, type Clip, type ImageMotion, type TextItem, type Timeline } from "@/lib/editor/types";

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="border-b border-white/6 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`h-8 rounded-lg border px-2.5 text-xs font-semibold transition ${value === o.id ? "border-lime-400 bg-lime-400/10 text-lime-300" : "border-white/8 text-ink-300 hover:border-white/20"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-1.5 text-sm text-ink-200">
      {label}
      <span className={`relative h-5 w-9 rounded-full transition ${on ? "bg-lime-400" : "bg-ink-600"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

const small = "h-9 w-full rounded-lg border border-white/8 bg-ink-900 px-2.5 text-sm outline-none focus:border-lime-400/60";

export function ClipInspector({ clip, onChange, onSplit, onDuplicate, onDelete, outDuration }: { clip: Clip; onChange: (patch: Partial<Clip>, commit?: boolean) => void; onSplit: () => void; onDuplicate: () => void; onDelete: () => void; outDuration: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{clip.name}</div>
          <div className="text-xs text-ink-400">{clip.kind === "video" ? "Vídeo" : "Foto animada"} · {fmt(outDuration)} s na linha do tempo</div>
        </div>
      </div>

      <Section title="Velocidade" right={<span className="rounded-md bg-lime-400/10 px-1.5 py-0.5 text-xs font-bold text-lime-300">{fmt(clip.speed)}x</span>}>
        <div className="grid grid-cols-2 gap-2">
          {CURVES.map((c) => (
            <button
              key={c.id}
              onClick={() => onChange({ curve: c.id })}
              className={`rounded-xl border p-2.5 text-left transition ${clip.curve === c.id ? "border-lime-400 bg-lime-400/[0.06]" : "border-white/6 bg-ink-900 hover:border-white/15"}`}
            >
              <svg viewBox="0 0 100 40" className="h-7 w-full">
                <path d={curvePath(c.id)} fill="none" stroke={clip.curve === c.id ? "#c6f432" : "#9aa3b2"} strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="100" cy="20" r="0" />
              </svg>
              <div className={`mt-1 text-xs font-semibold ${clip.curve === c.id ? "text-lime-300" : "text-ink-200"}`}>{c.name}</div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-ink-400"><span>Velocidade base</span><span>0,25x – 4x</span></div>
          <input type="range" className="range w-full" min={0.25} max={4} step={0.05} value={clip.speed} onChange={(e) => onChange({ speed: Number(e.target.value) }, false)} onPointerUp={() => onChange({}, true)} />
          <div className="mt-2 flex gap-1.5">
            {[0.5, 1, 1.5, 2].map((s) => (
              <button key={s} onClick={() => onChange({ speed: s })} className={`h-7 flex-1 rounded-md border text-xs font-semibold ${clip.speed === s ? "border-lime-400 text-lime-300" : "border-white/8 text-ink-300"}`}>{fmt(s)}x</button>
            ))}
          </div>
        </div>
      </Section>

      {clip.kind === "image" ? (
        <>
          <Section title="Movimento da foto">
            <Seg<ImageMotion>
              value={clip.motion}
              onChange={(motion) => onChange({ motion })}
              options={[
                { id: "zoom-in", label: "Aproximar" },
                { id: "zoom-out", label: "Afastar" },
                { id: "pan-left", label: "← Panorâmica" },
                { id: "pan-right", label: "Panorâmica →" },
                { id: "none", label: "Parada" },
              ]}
            />
          </Section>
          <Section title="Duração da foto" right={<span className="text-xs text-ink-300">{fmt(clip.out)} s</span>}>
            <input type="range" className="range w-full" min={1} max={15} step={0.5} value={clip.out} onChange={(e) => onChange({ out: Number(e.target.value), srcDuration: Number(e.target.value), in: 0 }, false)} onPointerUp={() => onChange({}, true)} />
          </Section>
        </>
      ) : (
        <Section title="Corte">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-400">Início (s)
              <input type="number" step={0.1} min={0} max={clip.out - 0.3} value={Number(clip.in.toFixed(2))} onChange={(e) => onChange({ in: Math.max(0, Math.min(clip.out - 0.3, Number(e.target.value))) })} className={`${small} mt-1`} />
            </label>
            <label className="text-xs text-ink-400">Fim (s)
              <input type="number" step={0.1} min={clip.in + 0.3} max={clip.srcDuration} value={Number(clip.out.toFixed(2))} onChange={(e) => onChange({ out: Math.min(clip.srcDuration, Math.max(clip.in + 0.3, Number(e.target.value))) })} className={`${small} mt-1`} />
            </label>
          </div>
          <p className="mt-2 text-xs text-ink-500">Arquivo original: {fmt(clip.srcDuration)} s. Você também pode arrastar as bordas do clipe.</p>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-ink-400"><span>Volume do clipe</span><span>{Math.round(clip.volume * 100)}%</span></div>
            <input type="range" className="range w-full" min={0} max={1} step={0.05} value={clip.volume} onChange={(e) => onChange({ volume: Number(e.target.value) }, false)} onPointerUp={() => onChange({}, true)} />
          </div>
        </Section>
      )}

      <Section title="Mobília virtual">
        <Toggle on={Boolean(clip.staged)} onChange={(staged) => onChange({ staged })} label="Mostrar “Imagem ilustrativa”" />
      </Section>

      <div className="grid grid-cols-3 gap-2 p-4">
        <button onClick={onSplit} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/6 text-xs font-semibold hover:bg-white/10"><Scissors className="h-3.5 w-3.5" /> Dividir</button>
        <button onClick={onDuplicate} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/6 text-xs font-semibold hover:bg-white/10"><Copy className="h-3.5 w-3.5" /> Duplicar</button>
        <button onClick={onDelete} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-500/10 text-xs font-semibold text-red-300 hover:bg-red-500/20"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
      </div>
    </div>
  );
}

export function TextInspector({ item, onChange, onDelete }: { item: TextItem; onChange: (patch: Partial<TextItem>, commit?: boolean) => void; onDelete: () => void }) {
  return (
    <div>
      <Section title="Texto">
        <textarea value={item.text} onChange={(e) => onChange({ text: e.target.value }, false)} onBlur={() => onChange({}, true)} rows={3} className="w-full resize-none rounded-lg border border-white/8 bg-ink-900 p-2.5 text-sm outline-none focus:border-lime-400/60" />
      </Section>
      <Section title="Estilo">
        <Seg value={item.style} onChange={(style) => onChange({ style })} options={[{ id: "title", label: "Título" }, { id: "caption", label: "Legenda" }, { id: "highlight", label: "Destaque" }]} />
      </Section>
      <Section title="Posição">
        <Seg value={item.position} onChange={(position) => onChange({ position })} options={[{ id: "top", label: "Topo" }, { id: "center", label: "Centro" }, { id: "bottom", label: "Base" }]} />
      </Section>
      <Section title="Tempo">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-400">Começa em (s)
            <input type="number" step={0.1} min={0} value={Number(item.start.toFixed(2))} onChange={(e) => onChange({ start: Math.max(0, Number(e.target.value)) })} className={`${small} mt-1`} />
          </label>
          <label className="text-xs text-ink-400">Duração (s)
            <input type="number" step={0.1} min={0.5} value={Number(item.duration.toFixed(2))} onChange={(e) => onChange({ duration: Math.max(0.5, Number(e.target.value)) })} className={`${small} mt-1`} />
          </label>
        </div>
      </Section>
      <div className="p-4">
        <button onClick={onDelete} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-red-500/10 text-xs font-semibold text-red-300 hover:bg-red-500/20"><Trash2 className="h-3.5 w-3.5" /> Excluir texto</button>
      </div>
    </div>
  );
}

export function ProjectInspector({ tl, onChange, audioFiles, onPickMusic }: { tl: Timeline; onChange: (patch: Partial<Timeline>, commit?: boolean) => void; audioFiles: { url: string; name: string }[]; onPickMusic: () => void }) {
  const card = tl.card;
  const setCard = (p: Partial<Timeline["card"]>, commit = true) => onChange({ card: { ...card, ...p } }, commit);
  const setBrand = (p: Partial<Timeline["branding"]>) => onChange({ branding: { ...tl.branding, ...p } });
  return (
    <div>
      <Section title="Formato">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ASPECT_SIZE) as Aspect[]).map((a) => {
            const s = ASPECT_SIZE[a];
            const active = tl.aspect === a;
            return (
              <button key={a} onClick={() => onChange({ aspect: a })} className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${active ? "border-lime-400 bg-lime-400/[0.06]" : "border-white/6 bg-ink-900 hover:border-white/15"}`}>
                <span className={`block shrink-0 rounded-[3px] border-2 ${active ? "border-lime-400" : "border-ink-400"}`} style={{ width: (s.w / Math.max(s.w, s.h)) * 22, height: (s.h / Math.max(s.w, s.h)) * 22 }} />
                <span>
                  <span className="block text-sm font-bold">{a}</span>
                  <span className="block text-[11px] text-ink-400">{s.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <Seg value={tl.fit} onChange={(fit) => onChange({ fit })} options={[{ id: "blur", label: "Foto inteira + fundo desfocado" }, { id: "cover", label: "Preencher a tela" }]} />
        </div>
        <div className="mt-2"><Toggle on={tl.fades} onChange={(fades) => onChange({ fades })} label="Transição suave entre clipes" /></div>
      </Section>

      <Section title="Música">
        {tl.music ? (
          <div>
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-ink-900 p-2.5">
              <Music2 className="h-4 w-4 text-lime-400" />
              <span className="min-w-0 flex-1 truncate text-sm">{tl.music.name}</span>
              <button onClick={() => onChange({ music: null })} className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mb-1.5 mt-3 flex justify-between text-xs text-ink-400"><span>Volume</span><span>{Math.round(tl.music.volume * 100)}%</span></div>
            <input type="range" className="range w-full" min={0} max={1} step={0.05} value={tl.music.volume} onChange={(e) => onChange({ music: { ...tl.music!, volume: Number(e.target.value) } }, false)} onPointerUp={() => onChange({}, true)} />
          </div>
        ) : (
          <div className="space-y-2">
            {audioFiles.slice(0, 5).map((a) => (
              <button key={a.url} onClick={() => onChange({ music: { src: a.url, name: a.name, volume: 0.7 } })} className="flex w-full items-center gap-2 rounded-lg border border-white/6 bg-ink-900 px-2.5 py-2 text-left text-sm hover:border-white/15">
                <Music2 className="h-4 w-4 text-ink-400" /> <span className="truncate">{a.name}</span>
              </button>
            ))}
            <button onClick={onPickMusic} className="h-9 w-full rounded-lg border border-dashed border-white/15 text-xs font-semibold text-ink-300 hover:border-lime-400/60 hover:text-lime-300">+ Enviar música (MP3)</button>
            <p className="text-[11px] leading-relaxed text-ink-500">Use músicas livres de direitos autorais (ex.: biblioteca de áudio do YouTube) para não ter o vídeo bloqueado.</p>
          </div>
        )}
      </Section>

      <Section title="Sua marca">
        <Toggle on={tl.branding.enabled} onChange={(enabled) => setBrand({ enabled })} label="Mostrar marca no vídeo" />
        {tl.branding.enabled && (
          <div className="mt-1 border-l border-white/10 pl-3">
            <Toggle on={tl.branding.logo} onChange={(logo) => setBrand({ logo })} label="Logo e nome" />
            <Toggle on={tl.branding.whatsapp} onChange={(whatsapp) => setBrand({ whatsapp })} label="WhatsApp" />
            <Toggle on={tl.branding.creci} onChange={(creci) => setBrand({ creci })} label="CRECI" />
          </div>
        )}
        <a href="/studio/conta" className="mt-2 block text-xs text-lime-400 hover:underline">Editar logo, cor e contato →</a>
      </Section>

      <Section title="Cartão do imóvel">
        <Toggle on={card.enabled} onChange={(enabled) => setCard({ enabled })} label="Mostrar preço e detalhes" />
        {card.enabled && (
          <div className="mt-3 space-y-2">
            <Seg value={card.show} onChange={(show) => setCard({ show })} options={[{ id: "start", label: "No início" }, { id: "end", label: "No final" }, { id: "always", label: "O tempo todo" }]} />
            <input className={small} placeholder="Título (ex.: Apartamento à venda)" value={card.title} onChange={(e) => setCard({ title: e.target.value }, false)} onBlur={() => setCard({}, true)} />
            <input className={small} placeholder="Preço (ex.: R$ 890.000)" value={card.price} onChange={(e) => setCard({ price: e.target.value }, false)} onBlur={() => setCard({}, true)} />
            <div className="grid grid-cols-4 gap-2">
              <input className={small} placeholder="Qts" value={card.bedrooms} onChange={(e) => setCard({ bedrooms: e.target.value }, false)} onBlur={() => setCard({}, true)} />
              <input className={small} placeholder="Banh" value={card.bathrooms} onChange={(e) => setCard({ bathrooms: e.target.value }, false)} onBlur={() => setCard({}, true)} />
              <input className={small} placeholder="Vagas" value={card.parking} onChange={(e) => setCard({ parking: e.target.value }, false)} onBlur={() => setCard({}, true)} />
              <input className={small} placeholder="m²" value={card.area} onChange={(e) => setCard({ area: e.target.value }, false)} onBlur={() => setCard({}, true)} />
            </div>
            <input className={small} placeholder="Bairro, cidade" value={card.location} onChange={(e) => setCard({ location: e.target.value }, false)} onBlur={() => setCard({}, true)} />
          </div>
        )}
      </Section>
    </div>
  );
}

export type TemplateId = "reels" | "tour" | "luxo";

const TEMPLATES: { id: TemplateId; name: string; desc: string; icon: typeof Rocket }[] = [
  { id: "reels", name: "Reels dinâmico", desc: "9:16, entrada rápida, título de destaque e cartão no final", icon: Rocket },
  { id: "tour", name: "Tour do imóvel", desc: "16:9 para YouTube e portais, ritmo constante e legenda", icon: Tv },
  { id: "luxo", name: "Alto padrão", desc: "9:16 em câmera lenta (bullet time), título elegante", icon: Gem },
];

export function TemplatesSection({ onApply }: { onApply: (id: TemplateId) => void }) {
  return (
    <Section title="Modelos prontos">
      <div className="space-y-2">
        {TEMPLATES.map(({ id, name, desc, icon: Icon }) => (
          <button key={id} onClick={() => onApply(id)} className="flex w-full items-start gap-3 rounded-xl border border-white/6 bg-ink-900 p-3 text-left transition hover:border-lime-400/50 hover:bg-lime-400/[0.04]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lime-400/10 text-lime-400"><Icon className="h-4 w-4" /></span>
            <span>
              <span className="block text-sm font-semibold">{name}</span>
              <span className="block text-xs text-ink-400">{desc}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-500">Aplica formato, ritmo e textos de uma vez. Dá para desfazer com Ctrl+Z.</p>
    </Section>
  );
}
