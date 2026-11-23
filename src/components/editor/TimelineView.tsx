"use client";
import { useRef, useState } from "react";
import { Film, Gauge, Music2, Type } from "lucide-react";
import { speedAt, uAt } from "@/lib/editor/curves";
import type { LayoutItem } from "@/lib/editor/engine";
import type { Clip, TextItem, Timeline } from "@/lib/editor/types";

export type Selection = { type: "clip" | "text" | "overlay"; id: string } | null;

type Props = {
  tl: Timeline;
  items: LayoutItem[];
  total: number;
  time: number;
  zoom: number;
  selection: Selection;
  onSeek: (t: number) => void;
  onSelect: (s: Selection) => void;
  onBegin: () => void;
  onReorder: (from: number, to: number) => void;
  onClipEdit: (id: string, patch: Partial<Clip>) => void;
  onTextEdit: (id: string, patch: Partial<TextItem>) => void;
};

const LABEL_W = 92;
const fmtS = (n: number) => `${n.toFixed(1).replace(".", ",")} s`;

export function TimelineView(p: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number } | null>(null);
  const width = Math.max(p.total + 6, 12) * p.zoom;
  const step = p.zoom >= 90 ? 0.5 : p.zoom >= 45 ? 1 : p.zoom >= 22 ? 2 : 5;
  const ticks = Array.from({ length: Math.ceil(width / p.zoom / step) + 1 }, (_, i) => i * step);

  function timeFromEvent(e: React.PointerEvent | PointerEvent) {
    const el = scroller.current!;
    const rect = el.getBoundingClientRect();
    return Math.max(0, (e.clientX - rect.left - LABEL_W + el.scrollLeft) / p.zoom);
  }

  function startScrub(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    e.preventDefault();
    p.onSeek(Math.min(p.total, timeFromEvent(e)));
    if (!(e.target as HTMLElement).closest("[data-block]")) p.onSelect(null);
    const move = (ev: PointerEvent) => p.onSeek(Math.min(p.total, timeFromEvent(ev)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Arrasto genérico: chama onMove com o deslocamento em segundos. */
  function gesture(e: React.PointerEvent, opts: { onClick?: () => void; onStart?: () => void; onMove: (dxSec: number, dxPx: number) => void; onEnd?: (dxPx: number) => void }) {
    e.stopPropagation();
    e.preventDefault();
    const x0 = e.clientX;
    let started = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!started && Math.abs(dx) < 4) return;
      if (!started) {
        started = true;
        opts.onStart?.();
      }
      opts.onMove(dx / p.zoom, dx);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!started) opts.onClick?.();
      else opts.onEnd?.(ev.clientX - x0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function clipBody(e: React.PointerEvent, it: LayoutItem, index: number) {
    gesture(e, {
      onClick: () => p.onSelect({ type: "clip", id: it.clip.id }),
      onStart: () => p.onSelect({ type: "clip", id: it.clip.id }),
      onMove: (_s, dx) => setDrag({ id: it.clip.id, dx }),
      onEnd: (dx) => {
        setDrag(null);
        const center = (it.start + it.duration / 2) * p.zoom + dx;
        let to = 0;
        p.items.forEach((o, i) => {
          if (i !== index && (o.start + o.duration / 2) * p.zoom < center) to++;
        });
        if (to !== index) p.onReorder(index, to);
      },
    });
  }

  function clipEdge(e: React.PointerEvent, it: LayoutItem, edge: "l" | "r") {
    const c = { ...it.clip };
    const rate = (c.out - c.in) / it.duration; // segundos de origem por segundo de saída
    gesture(e, {
      onStart: () => {
        p.onBegin();
        p.onSelect({ type: "clip", id: c.id });
      },
      onMove: (ds) => {
        if (c.kind === "image") {
          const d = edge === "r" ? c.out + ds * rate : c.out - ds * rate;
          const out = Math.max(1, Math.min(20, d));
          p.onClipEdit(c.id, { in: 0, out, srcDuration: out });
        } else if (edge === "l") {
          p.onClipEdit(c.id, { in: Math.max(0, Math.min(c.out - 0.3, c.in + ds * rate)) });
        } else {
          p.onClipEdit(c.id, { out: Math.min(c.srcDuration, Math.max(c.in + 0.3, c.out + ds * rate)) });
        }
      },
    });
  }

  function textBody(e: React.PointerEvent, t: TextItem) {
    const start0 = t.start;
    gesture(e, {
      onClick: () => p.onSelect({ type: "text", id: t.id }),
      onStart: () => {
        p.onBegin();
        p.onSelect({ type: "text", id: t.id });
      },
      onMove: (ds) => p.onTextEdit(t.id, { start: Math.max(0, start0 + ds) }),
    });
  }

  function textEdge(e: React.PointerEvent, t: TextItem) {
    const d0 = t.duration;
    gesture(e, {
      onStart: () => {
        p.onBegin();
        p.onSelect({ type: "text", id: t.id });
      },
      onMove: (ds) => p.onTextEdit(t.id, { duration: Math.max(0.5, d0 + ds) }),
    });
  }

  return (
    <div ref={scroller} className="relative h-full overflow-x-auto overflow-y-hidden select-none" onPointerDown={startScrub}>
      <div className="relative" style={{ width: width + LABEL_W }}>
        {/* régua */}
        <div className="sticky top-0 z-10 flex h-8 border-b border-white/6 bg-ink-900">
          <div className="sticky left-0 z-20 shrink-0 bg-ink-900" style={{ width: LABEL_W }} />
          <div className="relative flex-1">
            {ticks.map((t) => (
              <div key={t} className="absolute top-0 h-full border-l border-white/8 pl-1.5 pt-1.5 text-[11px] tabular-nums text-ink-400" style={{ left: t * p.zoom }}>
                {Number.isInteger(t) || step < 1 ? fmtS(t) : ""}
              </div>
            ))}
          </div>
        </div>

        <Track label="Texto" icon={Type} h={44}>
          {p.tl.texts.map((t) => {
            const sel = p.selection?.type === "text" && p.selection.id === t.id;
            return (
              <div
                key={t.id}
                data-block
                onPointerDown={(e) => textBody(e, t)}
                className={`absolute top-1.5 flex h-[32px] cursor-grab items-center overflow-hidden rounded-lg border px-2 text-xs font-semibold active:cursor-grabbing ${sel ? "border-violet-300 bg-violet-400/35 text-white" : "border-violet-400/30 bg-violet-400/15 text-violet-200"}`}
                style={{ left: t.start * p.zoom, width: Math.max(16, t.duration * p.zoom) }}
              >
                <span className="truncate">{t.text || "Texto"}</span>
                <span data-block onPointerDown={(e) => textEdge(e, t)} className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-violet-300/40" />
              </div>
            );
          })}
        </Track>

        <Track label="Vídeo" icon={Film} h={78}>
          {p.items.map((it, i) => {
            const c = it.clip;
            const sel = p.selection?.type === "clip" && p.selection.id === c.id;
            const w = Math.max(10, it.duration * p.zoom);
            const dx = drag?.id === c.id ? drag.dx : 0;
            const pts: string[] = [];
            const N = Math.max(8, Math.round(w / 6));
            for (let k = 0; k <= N; k++) {
              const s = Math.min(3, speedAt(c, uAt(it.lut, (k / N) * it.duration)));
              pts.push(`${((k / N) * w).toFixed(1)},${(12 - ((s - 0.25) / 2.75) * 10).toFixed(1)}`);
            }
            return (
              <div
                key={c.id}
                data-block
                onPointerDown={(e) => clipBody(e, it, i)}
                className={`absolute top-1 h-[70px] cursor-grab active:cursor-grabbing ${dx ? "z-20 opacity-90 shadow-2xl" : ""}`}
                style={{ left: it.start * p.zoom, width: w, transform: dx ? `translateX(${dx}px)` : undefined }}
              >
                <svg className="pointer-events-none absolute -top-0.5 left-0 h-3 w-full overflow-visible" viewBox={`0 0 ${w} 12`} preserveAspectRatio="none">
                  <polyline points={pts.join(" ")} fill="none" stroke="#c6f432" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
                <div
                  className={`absolute inset-x-0 bottom-0 top-3 overflow-hidden rounded-lg border-2 ${sel ? "border-lime-400" : "border-transparent"}`}
                  style={{
                    backgroundColor: "#1f242d",
                    backgroundImage: c.thumb ? `url("${c.thumb}")` : "linear-gradient(135deg,#2a313c,#161a21)",
                    backgroundSize: "auto 100%",
                    backgroundRepeat: "repeat-x",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-1.5 bottom-1 flex items-center gap-1 text-[11px] font-medium text-white">
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {(c.speed !== 1 || c.curve !== "constant") && w > 70 && (
                      <span className="flex shrink-0 items-center gap-0.5 rounded bg-lime-400 px-1 text-[10px] font-bold text-black"><Gauge className="h-2.5 w-2.5" />{c.speed.toLocaleString("pt-BR")}x</span>
                    )}
                    {w > 50 && <span className="shrink-0 tabular-nums text-white/80">{it.duration.toFixed(1).replace(".", ",")} s</span>}
                  </div>
                  {c.staged && <span className="absolute left-1.5 top-1 rounded bg-violet-400/90 px-1 text-[9px] font-bold text-black">MOBÍLIA</span>}
                </div>
                <span data-block onPointerDown={(e) => clipEdge(e, it, "l")} className={`absolute bottom-0 left-0 top-3 w-2 cursor-ew-resize rounded-l-lg ${sel ? "bg-lime-400" : "hover:bg-white/40"}`} />
                <span data-block onPointerDown={(e) => clipEdge(e, it, "r")} className={`absolute bottom-0 right-0 top-3 w-2 cursor-ew-resize rounded-r-lg ${sel ? "bg-lime-400" : "hover:bg-white/40"}`} />
              </div>
            );
          })}
          {!p.items.length && <div className="absolute left-3 top-6 text-xs text-ink-500">Clique em + na biblioteca para adicionar clipes</div>}
        </Track>

        <Track label="Música" icon={Music2} h={44}>
          {p.tl.music && p.total > 0 && (
            <div className="absolute top-1.5 flex h-[32px] items-center gap-2 overflow-hidden rounded-lg border border-sky-400/30 bg-sky-400/15 px-2 text-xs font-semibold text-sky-200" style={{ left: 0, width: p.total * p.zoom }}>
              <Music2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{p.tl.music.name}</span>
              <svg className="absolute inset-0 -z-10 h-full w-full opacity-40" preserveAspectRatio="none" viewBox="0 0 100 10">
                {Array.from({ length: 100 }).map((_, i) => <rect key={i} x={i} y={5 - (Math.abs(Math.sin(i * 1.7)) * 4 + 0.5)} width="0.6" height={(Math.abs(Math.sin(i * 1.7)) * 4 + 0.5) * 2} fill="currentColor" />)}
              </svg>
            </div>
          )}
        </Track>

        {/* agulha */}
        <div className="pointer-events-none absolute bottom-0 top-0 z-30" style={{ left: LABEL_W + p.time * p.zoom }}>
          <div className="absolute -left-[6px] top-0 h-0 w-0 border-x-[6px] border-t-[9px] border-x-transparent border-t-red-500" />
          <div className="h-full w-0.5 -translate-x-1/2 bg-red-500" />
        </div>
      </div>
    </div>
  );
}

function Track({ label, icon: Icon, h, children }: { label: string; icon: typeof Film; h: number; children: React.ReactNode }) {
  return (
    <div className="flex border-b border-white/5" style={{ height: h }}>
      <div className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-white/5 bg-ink-900 pl-3 text-xs text-ink-400" style={{ width: LABEL_W }}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}
