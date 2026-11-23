"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FilePlus2,
  Layers,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Redo2,
  Scissors,
  SkipBack,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useStudio } from "@/components/studio/StudioContext";
import { api, uploadFile } from "@/lib/client";
import { uAt } from "@/lib/editor/curves";
import { computeLayout, Engine, type HitBox } from "@/lib/editor/engine";
import { ensureFont } from "@/lib/editor/fonts";
import { ASPECT_SIZE, emptyTimeline, uid, type BrandInfo, type Clip, type OverlayId, type Placement, type TextItem, type Timeline } from "@/lib/editor/types";
import type { EditorProject, Generation, MediaFile } from "@/lib/store/types";
import { ClipInspector, OverlayInspector, ProjectInspector, TemplatesSection, TextInspector, type TemplateId } from "./Inspector";
import { generationToItem, Library, type LibraryItem } from "./Library";
import { TimelineView, type Selection } from "./TimelineView";

const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0").replace(".", ",")}`;
};

function probeVideo(url: string) {
  return new Promise<number>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(isFinite(v.duration) ? v.duration : 5);
    v.onerror = () => resolve(5);
    v.src = url;
  });
}

/** Converte um item da biblioteca em clipe da linha do tempo. */
async function makeClip(item: LibraryItem): Promise<Clip> {
  if (item.kind === "video") {
    const d = await probeVideo(item.url);
    return { id: uid(), kind: "video", src: item.url, thumb: item.thumb ?? null, name: item.name, srcDuration: d, in: 0, out: d, speed: 1, curve: "constant", motion: "none", volume: 1, staged: item.staged };
  }
  return { id: uid(), kind: "image", src: item.url, thumb: item.thumb ?? item.url, name: item.name, srcDuration: 3, in: 0, out: 3, speed: 1, curve: "constant", motion: "zoom-in", volume: 0, staged: item.staged };
}

export function Editor() {
  const { profile } = useStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const musicInput = useRef<HTMLInputElement>(null);

  const [tl, setTl] = useState<Timeline>(emptyTimeline);
  const [past, setPast] = useState<Timeline[]>([]);
  const [future, setFuture] = useState<Timeline[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [boxes, setBoxes] = useState<HitBox[]>([]);
  const [canvasBox, setCanvasBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(70);
  const [projects, setProjects] = useState<EditorProject[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [name, setName] = useState("Projeto sem título");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);
  const [projMenu, setProjMenu] = useState(false);
  const [exporting, setExporting] = useState<{ progress: number; url?: string; ext?: string; error?: string } | null>(null);
  const [audioFiles, setAudioFiles] = useState<{ url: string; name: string }[]>([]);
  const [mobilePanel, setMobilePanel] = useState<"library" | "settings">("library");
  const [importing, setImporting] = useState(false);
  const dirty = useRef(false);

  const brand: BrandInfo = useMemo(
    () => ({
      name: profile.company_name || profile.full_name || "",
      color: profile.brand_color,
      logoUrl: profile.logo_url,
      whatsapp: profile.whatsapp,
      creci: profile.creci,
    }),
    [profile],
  );
  const { items, total } = useMemo(() => computeLayout(tl), [tl]);

  // ---------------------------------------------------------------- motor
  useEffect(() => {
    if (!canvasRef.current) return;
    const e = new Engine(canvasRef.current);
    e.onTime = setTime;
    e.onBoxes = setBoxes;
    e.onState = setPlaying;
    engineRef.current = e;
    return () => e.destroy();
  }, []);
  useEffect(() => {
    engineRef.current?.setTimeline(tl, brand);
  }, [tl, brand]);

  // ---------------------------------------------------------------- projetos
  const loadProject = useCallback(async (id: string) => {
    const r = await api<{ project: EditorProject }>(`/api/projects/${id}`);
    const t = { ...emptyTimeline(), ...(r.project.timeline as Partial<Timeline>) } as Timeline;
    engineRef.current?.pause();
    setTl(t);
    setPast([]);
    setFuture([]);
    setSelection(null);
    setProjectId(r.project.id);
    setName(r.project.name);
    setTime(0);
    engineRef.current?.seek(0);
    dirty.current = false;
    setSaveState("saved");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ projects: EditorProject[] }>("/api/projects");
        setProjects(r.projects);
        const gens = new URLSearchParams(window.location.search).get("gens")?.split(",").filter(Boolean) ?? [];
        if (gens.length) {
          // veio do "Criar": monta um projeto novo com os vídeos gerados
          setImporting(true);
          const g = await api<{ generations: Generation[] }>("/api/generations");
          const picked = gens.map((id) => g.generations.find((x) => x.id === id)).filter(Boolean).map((x) => generationToItem(x!)).filter(Boolean) as LibraryItem[];
          const clips = await Promise.all(picked.map(makeClip));
          const base = emptyTimeline();
          setTl({ ...base, clips, card: { ...base.card, enabled: true, show: "end" } });
          setName(`Imóvel ${new Date().toLocaleDateString("pt-BR")}`);
          setProjectId(undefined);
          dirty.current = true;
          window.history.replaceState(null, "", "/studio/editor");
          setImporting(false);
        } else if (r.projects[0]) await loadProject(r.projects[0].id);
      } finally {
        setLoaded(true);
      }
      api<{ media: MediaFile[] }>("/api/media").then((r) => setAudioFiles(r.media.filter((m) => m.kind === "audio").map((m) => ({ url: m.url, name: m.name })))).catch(() => {});
    })();
  }, [loadProject]);

  // salvamento automático
  useEffect(() => {
    if (!loaded || !dirty.current) return;
    setSaveState("saving");
    const h = setTimeout(async () => {
      try {
        const r = await api<{ project: EditorProject }>("/api/projects", { json: { id: projectId, name, timeline: tl } });
        if (!projectId) {
          setProjectId(r.project.id);
          setProjects((ps) => [r.project, ...ps]);
        } else {
          setProjects((ps) => ps.map((p) => (p.id === r.project.id ? { ...p, name: r.project.name, updated_at: r.project.updated_at } : p)));
        }
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1200);
    return () => clearTimeout(h);
  }, [tl, name, loaded, projectId]);

  function newProject() {
    engineRef.current?.pause();
    setTl(emptyTimeline());
    setPast([]);
    setFuture([]);
    setProjectId(undefined);
    setName("Projeto sem título");
    setSelection(null);
    setTime(0);
    dirty.current = false;
    setSaveState("idle");
    setProjMenu(false);
  }

  // ---------------------------------------------------------------- histórico
  const commit = useCallback((next: Timeline | ((t: Timeline) => Timeline)) => {
    setTl((cur) => {
      const n = typeof next === "function" ? next(cur) : next;
      if (n === cur) return cur;
      setPast((p) => [...p.slice(-60), cur]);
      setFuture([]);
      dirty.current = true;
      return n;
    });
  }, []);
  /** Mudança "ao vivo" (arrastar slider) sem gravar no histórico. */
  const live = useCallback((fn: (t: Timeline) => Timeline) => {
    setTl((cur) => {
      dirty.current = true;
      return fn(cur);
    });
  }, []);
  const snapshot = useCallback(() => {
    setTl((cur) => {
      setPast((p) => [...p.slice(-60), cur]);
      setFuture([]);
      return cur;
    });
  }, []);
  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setTl((cur) => {
        setFuture((f) => [cur, ...f]);
        return prev;
      });
      dirty.current = true;
      return p.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setTl((cur) => {
        setPast((p) => [...p, cur]);
        return next;
      });
      dirty.current = true;
      return f.slice(1);
    });
  }, []);

  // ---------------------------------------------------------------- ações
  async function addFromLibrary(item: LibraryItem) {
    if (item.kind === "audio") {
      commit((t) => ({ ...t, music: { src: item.url, name: item.name, volume: 0.7 } }));
      return;
    }
    const clip = await makeClip(item);
    commit((t) => ({ ...t, clips: [...t.clips, clip] }));
    setSelection({ type: "clip", id: clip.id });
  }

  function applyTemplate(id: TemplateId) {
    commit((t) => {
      const firstTitle = (text: string, style: TextItem["style"], position: TextItem["position"]): TextItem[] =>
        t.texts.length ? t.texts : [{ id: uid(), text, start: 0.2, duration: 2.6, style, position }];
      const clipsWith = (curve: Clip["curve"], speed: number) => t.clips.map((c) => (c.kind === "video" ? { ...c, curve, speed } : { ...c, motion: c.motion === "none" ? "zoom-in" : c.motion }));
      if (id === "reels")
        return { ...t, aspect: "9:16", fit: "blur", fades: true, clips: clipsWith("fast-in", 1.2), texts: firstTitle("Novo no mercado", "highlight", "top"), card: { ...t.card, enabled: true, show: "end" } };
      if (id === "tour")
        return { ...t, aspect: "16:9", fit: "cover", fades: true, clips: clipsWith("constant", 1), texts: firstTitle("Conheça o imóvel", "caption", "bottom"), card: { ...t.card, enabled: true, show: "end" } };
      return { ...t, aspect: "9:16", fit: "cover", fades: true, clips: clipsWith("bullet", 1), texts: firstTitle("Exclusividade", "title", "center"), card: { ...t.card, enabled: true, show: "end" } };
    });
    setSelection(null);
  }

  function addText() {
    const t: TextItem = { id: uid(), text: "Seu título aqui", start: Math.min(time, Math.max(0, total - 1)), duration: 3, style: "title", position: "center" };
    commit((x) => ({ ...x, texts: [...x.texts, t] }));
    setSelection({ type: "text", id: t.id });
  }

  const selectedClip = selection?.type === "clip" ? tl.clips.find((c) => c.id === selection.id) : undefined;
  const selectedText = selection?.type === "text" ? tl.texts.find((c) => c.id === selection.id) : undefined;

  function patchClip(id: string, patch: Partial<Clip>, withHistory = true) {
    const fn = (t: Timeline) => ({ ...t, clips: t.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    if (withHistory) commit(fn);
    else live(fn);
  }
  function patchText(id: string, patch: Partial<TextItem>, withHistory = true) {
    const fn = (t: Timeline) => ({ ...t, texts: t.texts.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    if (withHistory) commit(fn);
    else live(fn);
  }

  function split() {
    const target = selectedClip ? items.find((i) => i.clip.id === selectedClip.id) : items.find((i) => time >= i.start && time < i.start + i.duration);
    if (!target) return;
    const local = time - target.start;
    if (local < 0.15 || local > target.duration - 0.15) return;
    const c = target.clip;
    const u = uAt(target.lut, local);
    const cut = c.in + u * (c.out - c.in);
    const a: Clip = c.kind === "image" ? { ...c, out: cut, srcDuration: cut } : { ...c, out: cut };
    const b: Clip = c.kind === "image" ? { ...c, id: uid(), in: 0, out: c.out - cut, srcDuration: c.out - cut } : { ...c, id: uid(), in: cut };
    commit((t) => {
      const idx = t.clips.findIndex((x) => x.id === c.id);
      const clips = [...t.clips];
      clips.splice(idx, 1, a, b);
      return { ...t, clips };
    });
    setSelection({ type: "clip", id: b.id });
  }

  function duplicate() {
    if (!selectedClip) return;
    const copy = { ...selectedClip, id: uid() };
    commit((t) => {
      const idx = t.clips.findIndex((x) => x.id === selectedClip.id);
      const clips = [...t.clips];
      clips.splice(idx + 1, 0, copy);
      return { ...t, clips };
    });
    setSelection({ type: "clip", id: copy.id });
  }

  function removeSelected() {
    if (!selection) return;
    if (selection.type === "overlay") {
      // "excluir" um elemento fixo = escondê-lo
      if (selection.id === "card") commit((t) => ({ ...t, card: { ...t.card, enabled: false } }));
      else if (selection.id === "brand") commit((t) => ({ ...t, branding: { ...t.branding, logo: false } }));
      else commit((t) => ({ ...t, branding: { ...t.branding, whatsapp: false, creci: false } }));
    } else if (selection.type === "clip") commit((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== selection.id) }));
    else commit((t) => ({ ...t, texts: t.texts.filter((c) => c.id !== selection.id) }));
    setSelection(null);
  }

  function reorder(from: number, to: number) {
    commit((t) => {
      const clips = [...t.clips];
      const [m] = clips.splice(from, 1);
      clips.splice(to, 0, m);
      return { ...t, clips };
    });
  }

  // ------------------------------------------------------------ mover / redimensionar no vídeo
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const measure = () => {
      const c = canvas.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      setCanvasBox({ left: c.left - s.left, top: c.top - s.top, width: c.width, height: c.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [tl.aspect]);

  // baixa as fontes escolhidas e redesenha
  const fontsKey = [tl.cardFont, ...tl.texts.map((t) => t.font)].filter(Boolean).join(",");
  useEffect(() => {
    const ids = fontsKey.split(",").filter(Boolean) as Parameters<typeof ensureFont>[0][];
    if (!ids.length) return;
    Promise.all(ids.map(ensureFont)).then(() => engineRef.current?.renderStill());
  }, [fontsKey]);

  const placementOf = (b: HitBox): Placement => {
    const W = size.w;
    const H = size.h;
    if (b.kind === "text") {
      const t = tl.texts.find((x) => x.id === b.id);
      return { x: t?.x ?? (b.x + b.w / 2) / W, y: t?.y ?? (b.y + b.h / 2) / H, scale: t?.scale ?? 1 };
    }
    const p = tl.layout?.[b.kind];
    return p ?? { x: (b.x + b.w / 2) / W, y: (b.y + b.h / 2) / H, scale: 1 };
  };

  const applyPlacement = (b: HitBox, p: Placement) => {
    const cl = (v: number) => Math.max(0.02, Math.min(0.98, v));
    const np = { x: cl(p.x), y: cl(p.y), scale: Math.max(0.35, Math.min(3, p.scale)) };
    if (b.kind === "text") patchText(b.id, { x: np.x, y: np.y, scale: np.scale }, false);
    else live((t) => ({ ...t, layout: { ...(t.layout ?? {}), [b.kind]: np } }));
  };

  function onStagePointerDown(e: React.PointerEvent<HTMLElement>, handle?: HitBox) {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine || exporting) return;
    const rect = canvas.getBoundingClientRect();
    const toCanvas = (cx: number, cy: number) => ({ x: ((cx - rect.left) / rect.width) * size.w, y: ((cy - rect.top) / rect.height) * size.h });
    const start = toCanvas(e.clientX, e.clientY);
    const hit = handle ?? engine.hitTest(start.x, start.y);
    if (!hit) {
      // clique no vazio: play/pause e tira a seleção
      if (selection?.type === "overlay" || selection?.type === "text") setSelection(null);
      togglePlay();
      return;
    }
    if (engine.playing) engine.pause(); // clicou num elemento: pausa e seleciona
    e.preventDefault();
    e.stopPropagation();
    setSelection(hit.kind === "text" ? { type: "text", id: hit.id } : { type: "overlay", id: hit.kind });
    setMobilePanel("settings");
    const p0 = placementOf(hit);
    const center = { x: p0.x * size.w, y: p0.y * size.h };
    const d0 = Math.hypot(start.x - center.x, start.y - center.y) || 1;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const pt = toCanvas(ev.clientX, ev.clientY);
      if (!moved) {
        if (Math.hypot(pt.x - start.x, pt.y - start.y) < 6) return;
        moved = true;
        snapshot();
      }
      if (handle) {
        const d = Math.hypot(pt.x - center.x, pt.y - center.y);
        applyPlacement(hit, { ...p0, scale: p0.scale * (d / d0) });
      } else {
        applyPlacement(hit, { ...p0, x: p0.x + (pt.x - start.x) / size.w, y: p0.y + (pt.y - start.y) / size.h });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const selectedBox = !playing && selection && (selection.type === "text" || selection.type === "overlay") ? boxes.find((b) => b.id === selection.id) : undefined;

  const togglePlay = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    if (e.playing) e.pause();
    else e.play();
  }, []);

  async function doExport() {
    const e = engineRef.current;
    if (!e) return;
    setSelection(null);
    setExporting({ progress: 0 });
    try {
      const { blob, ext } = await e.exportVideo((progress) => setExporting((s) => (s ? { ...s, progress } : s)));
      setExporting({ progress: 1, url: URL.createObjectURL(blob), ext });
    } catch (err) {
      setExporting({ progress: 0, error: (err as Error).message });
    }
  }

  // atalhos de teclado
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || exporting) return;
      if (ev.code === "Space") { ev.preventDefault(); togglePlay(); }
      else if ((ev.key === "Delete" || ev.key === "Backspace") && selection) { ev.preventDefault(); removeSelected(); }
      else if (ev.key.toLowerCase() === "s" && !ev.metaKey && !ev.ctrlKey) split();
      else if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const inspector = (
    <>
          {selectedClip ? (
        <ClipInspector
          clip={selectedClip}
          outDuration={items.find((i) => i.clip.id === selectedClip.id)?.duration ?? 0}
          onChange={(patch, c = true) => (Object.keys(patch).length ? patchClip(selectedClip.id, patch, c) : snapshot())}
          onSplit={split}
          onDuplicate={duplicate}
          onDelete={removeSelected}
        />
      ) : selection?.type === "overlay" ? (
        <OverlayInspector
          id={selection.id as OverlayId}
          tl={tl}
          onScale={(scale, c) => {
            const b = boxes.find((x) => x.id === selection.id);
            if (b) applyPlacement(b, { ...placementOf(b), scale });
            if (c) snapshot();
          }}
          onReset={() => commit((t) => { const layout = { ...(t.layout ?? {}) }; delete layout[selection.id as OverlayId]; return { ...t, layout }; })}
          onFont={(cardFont) => commit((t) => ({ ...t, cardFont }))}
          onHide={removeSelected}
        />
      ) : selectedText ? (
        <TextInspector item={selectedText} onChange={(patch, c = true) => (Object.keys(patch).length ? patchText(selectedText.id, patch, c) : snapshot())} onDelete={removeSelected} />
      ) : (
        <ProjectInspector
          tl={tl}
          audioFiles={audioFiles}
          onPickMusic={() => musicInput.current?.click()}
          onChange={(patch, c = true) => (Object.keys(patch).length ? (c ? commit((t) => ({ ...t, ...patch })) : live((t) => ({ ...t, ...patch }))) : snapshot())}
        />
      )}
      {!selection && tl.clips.length > 0 && <TemplatesSection onApply={applyTemplate} />}
    </>
  );

  const size = ASPECT_SIZE[tl.aspect];
  const fitAll = () => {
    const w = (document.getElementById("timeline-wrap")?.clientWidth ?? 900) - 140;
    setZoom(Math.max(10, Math.min(200, w / Math.max(total, 3))));
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-ink-950">
      {/* barra superior */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/6 px-3 md:px-4">
        <div className="relative">
          <button onClick={() => setProjMenu(!projMenu)} className="flex h-9 items-center gap-2 rounded-xl border border-white/8 px-3 text-sm font-medium hover:bg-white/5">
            <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Projetos</span> <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {projMenu && (
            <div className="absolute left-0 top-11 z-50 w-72 rounded-2xl border border-white/10 bg-ink-850 p-1.5 shadow-2xl">
              <button onClick={newProject} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-lime-300 hover:bg-white/5"><FilePlus2 className="h-4 w-4" /> Novo projeto</button>
              <div className="my-1 h-px bg-white/6" />
              <div className="max-h-72 overflow-y-auto">
                {projects.length === 0 && <div className="px-3 py-2 text-xs text-ink-500">Nenhum projeto salvo</div>}
                {projects.map((p) => (
                  <button key={p.id} onClick={() => { setProjMenu(false); loadProject(p.id); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5 ${p.id === projectId ? "text-white" : "text-ink-300"}`}>
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-[11px] text-ink-500">{new Date(p.updated_at).toLocaleDateString("pt-BR")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <input value={name} onChange={(e) => { setName(e.target.value); dirty.current = true; }} className="h-9 min-w-0 max-w-[260px] flex-1 rounded-lg bg-transparent px-2 font-semibold outline-none hover:bg-white/4 focus:bg-white/5" />
        <span className="hidden shrink-0 items-center gap-1 text-xs text-ink-500 sm:flex">
          {saveState === "saving" ? <><Loader2 className="h-3 w-3 animate-spin" /> Salvando</> : saveState === "saved" ? <><Check className="h-3 w-3" /> Salvo</> : saveState === "error" ? <span className="text-red-300">Erro ao salvar</span> : null}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={undo} disabled={!past.length} className="grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-white/5 disabled:opacity-30" title="Desfazer (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
          <button onClick={redo} disabled={!future.length} className="grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-white/5 disabled:opacity-30" title="Refazer (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></button>
          <Button variant="primary" onClick={doExport} disabled={!tl.clips.length} className="ml-2"><Download className="h-4 w-4" /> Exportar</Button>
        </div>
      </div>

      {/* área principal */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr_320px]">
        <aside className="hidden min-h-0 border-r border-white/6 lg:block"><Library onAdd={addFromLibrary} /></aside>

        <section className="flex min-h-0 flex-col">
          <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_center,#161a21_0%,#07080a_70%)] p-4">
            <canvas
              ref={canvasRef}
              width={size.w}
              height={size.h}
              className="max-h-full max-w-full rounded-xl bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
              style={{ aspectRatio: `${size.w}/${size.h}`, height: "100%", width: "auto" }}
            />
            {canvasBox && tl.clips.length > 0 && (
              <div
                className="absolute touch-none"
                style={{ left: canvasBox.left, top: canvasBox.top, width: canvasBox.width, height: canvasBox.height, cursor: playing ? "pointer" : "default" }}
                onPointerDown={(e) => onStagePointerDown(e)}
                onPointerMove={(e) => {
                  if (playing || !canvasRef.current || !engineRef.current) return;
                  const r = canvasRef.current.getBoundingClientRect();
                  const over = engineRef.current.hitTest(((e.clientX - r.left) / r.width) * size.w, ((e.clientY - r.top) / r.height) * size.h);
                  e.currentTarget.style.cursor = over ? "move" : "pointer";
                }}
              >
                {!playing &&
                  boxes.map((b) => {
                    const sel = selectedBox?.id === b.id;
                    const sx = canvasBox.width / size.w;
                    const sy = canvasBox.height / size.h;
                    return (
                      <div
                        key={b.id}
                        className={`pointer-events-none absolute rounded-md transition-colors ${sel ? "border-2 border-lime-400 shadow-[0_0_0_9999px_rgba(0,0,0,0)]" : "border border-dashed border-white/0 hover:border-white/40"}`}
                        style={{ left: b.x * sx, top: b.y * sy, width: b.w * sx, height: b.h * sy }}
                      >
                        {sel && (
                          <>
                            <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-lime-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                              {b.kind === "text" ? "Texto" : b.kind === "card" ? "Cartão do imóvel" : b.kind === "brand" ? "Marca" : "Contato"} · arraste para mover
                            </span>
                            <span
                              className="pointer-events-auto absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-black bg-lime-400"
                              title="Arraste para mudar o tamanho"
                              onPointerDown={(e) => onStagePointerDown(e, b)}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
            {(!tl.clips.length || importing) && (
              <div className="absolute inset-0 grid place-items-center p-6">
                <div className="glass w-full max-w-md rounded-3xl bg-ink-900/80 p-6 text-center backdrop-blur">
                  {importing ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-ink-300"><Loader2 className="h-4 w-4 animate-spin text-lime-400" /> Montando seu vídeo…</div>
                  ) : (
                    <>
                      <h3 className="font-display text-xl font-bold">Monte o vídeo do imóvel</h3>
                      <ol className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm text-ink-300">
                        <li><b className="text-lime-300">1.</b> Clique em <b>+</b> nos vídeos ou fotos da <b>Biblioteca</b></li>
                        <li><b className="text-lime-300">2.</b> Escolha um <b>modelo pronto</b>, música e o cartão com preço</li>
                        <li><b className="text-lime-300">3.</b> Clique em <b>Exportar</b> e poste</li>
                      </ol>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Link href="/studio/criar"><Button variant="primary"><Sparkles className="h-4 w-4" /> Criar vídeos com IA</Button></Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <button onClick={() => canvasRef.current?.requestFullscreen?.()} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg bg-black/40 text-ink-300 backdrop-blur hover:text-white" title="Tela cheia"><Maximize2 className="h-4 w-4" /></button>
          </div>
          <div className="flex h-14 shrink-0 items-center gap-3 border-t border-white/6 px-4">
            <button onClick={() => engineRef.current?.seek(0)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-white/5"><SkipBack className="h-4 w-4" /></button>
            <button onClick={togglePlay} disabled={!tl.clips.length} className="grid h-11 w-11 place-items-center rounded-full bg-lime-400 text-black shadow-[0_6px_24px_-6px_rgba(198,244,50,0.7)] transition hover:bg-lime-300 disabled:opacity-40">
              {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
            </button>
            <span className="font-mono text-sm tabular-nums text-ink-200">{fmtTime(time)} <span className="text-ink-500">/ {fmtTime(total)}</span></span>
            <span className="ml-auto hidden text-xs text-ink-500 md:block">{size.w}×{size.h} · {tl.aspect} · Espaço = play · S = dividir</span>
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto border-l border-white/6 max-lg:hidden">
          {inspector}
        </aside>
      </div>

      {/* linha do tempo */}
      <div id="timeline-wrap" className="flex h-[268px] shrink-0 flex-col border-t border-white/6 bg-ink-900">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/6 px-3">
          <ToolBtn onClick={split} icon={Scissors} label="Dividir" />
          <ToolBtn onClick={removeSelected} icon={Trash2} label="" disabled={!selection} />
          <div className="mx-1 h-6 w-px bg-white/8" />
          <ToolBtn onClick={addText} icon={Type} label="+ Texto" />
          <ToolBtn onClick={() => musicInput.current?.click()} icon={MusicIcon} label="+ Música" />
          <div className="ml-auto flex items-center gap-2">
            <ZoomIn className="h-4 w-4 text-ink-500" />
            <input type="range" className="range w-28" min={10} max={200} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            <button onClick={fitAll} className="h-8 rounded-lg border border-white/8 px-3 text-xs font-semibold text-ink-200 hover:bg-white/5">Encaixar tudo</button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <TimelineView
            tl={tl}
            items={items}
            total={total}
            time={time}
            zoom={zoom}
            selection={selection}
            onSeek={(t) => engineRef.current?.seek(t)}
            onSelect={(sel) => {
              setSelection(sel);
              if (sel) setMobilePanel("settings");
            }}
            onBegin={snapshot}
            onReorder={reorder}
            onClipEdit={(id, patch) => patchClip(id, patch, false)}
            onTextEdit={(id, patch) => patchText(id, patch, false)}
          />
        </div>
      </div>

      {/* celular: biblioteca e ajustes em abas */}
      <div className="border-t border-white/6 lg:hidden">
        <div className="grid grid-cols-2 border-b border-white/6 text-sm font-semibold">
          <button onClick={() => setMobilePanel("library")} className={`py-2.5 ${mobilePanel === "library" ? "border-b-2 border-lime-400 text-white" : "text-ink-400"}`}>Biblioteca</button>
          <button onClick={() => setMobilePanel("settings")} className={`py-2.5 ${mobilePanel === "settings" ? "border-b-2 border-lime-400 text-white" : "text-ink-400"}`}>{selection ? "Ajustes do item" : "Ajustes do vídeo"}</button>
        </div>
        <div className="max-h-[45vh] overflow-y-auto">{mobilePanel === "library" ? <Library onAdd={addFromLibrary} /> : inspector}</div>
      </div>

      <input
        ref={musicInput}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const r = await uploadFile(f);
          setAudioFiles((a) => [{ url: r.url, name: r.name }, ...a]);
          commit((t) => ({ ...t, music: { src: r.url, name: r.name, volume: 0.7 } }));
        }}
      />

      {exporting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-850 p-6">
            {exporting.error ? (
              <>
                <h3 className="font-display text-xl font-bold">Não foi possível exportar</h3>
                <p className="mt-2 text-sm text-red-300">{exporting.error}</p>
                <Button className="mt-6 w-full" onClick={() => setExporting(null)}>Fechar</Button>
              </>
            ) : exporting.url ? (
              <>
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-2xl font-bold">Vídeo pronto! 🎉</h3>
                  <button onClick={() => setExporting(null)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5"><X className="h-4 w-4" /></button>
                </div>
                <video src={exporting.url} controls className="mt-4 max-h-[50vh] w-full rounded-xl bg-black" />
                <a href={exporting.url} download={`${name.replace(/[^\w\s-]/g, "").trim() || "video"}.${exporting.ext}`}>
                  <Button variant="primary" size="lg" className="mt-4 w-full"><Download className="h-4 w-4" /> Baixar {exporting.ext?.toUpperCase()}</Button>
                </a>
                {exporting.ext === "webm" && <p className="mt-2 text-center text-xs text-ink-400">Seu navegador gerou WebM. Para MP4 direto, use o Chrome atualizado.</p>}
              </>
            ) : (
              <>
                <h3 className="font-display text-xl font-bold">Exportando vídeo…</h3>
                <p className="mt-1 text-sm text-ink-400">A gravação acontece em tempo real ({fmtTime(total)}). Mantenha esta aba aberta.</p>
                <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full rounded-full bg-lime-400 transition-[width]" style={{ width: `${Math.round(exporting.progress * 100)}%` }} />
                </div>
                <div className="mt-2 text-right text-sm tabular-nums text-ink-300">{Math.round(exporting.progress * 100)}%</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MusicIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function ToolBtn({ onClick, icon: Icon, label, disabled }: { onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/8 px-2.5 text-xs font-semibold text-ink-200 transition hover:bg-white/5 disabled:opacity-30">
      <Icon className="h-3.5 w-3.5" /> {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
