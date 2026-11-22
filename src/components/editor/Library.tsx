"use client";
import { useEffect, useRef, useState } from "react";
import { Film, Image as ImageIcon, Loader2, Music2, Plus, Sofa, Upload } from "lucide-react";
import { api, uploadFile } from "@/lib/client";
import { CAMERA_MOVES } from "@/lib/creative";
import { getVideoModel } from "@/lib/models";
import type { Generation, MediaFile } from "@/lib/store/types";
import { useGenerations } from "../studio/useGenerations";

export type LibraryItem = { kind: "video" | "image" | "audio"; url: string; name: string; thumb?: string | null; staged?: boolean };

export function generationToItem(g: Generation): LibraryItem | null {
  if (g.status !== "completed" || !g.output_url) return null;
  const p = g.params as { cameraId?: string };
  const cam = CAMERA_MOVES.find((c) => c.id === p.cameraId)?.name;
  const staged = g.mode === "staging" || g.kind === "staging";
  return {
    kind: g.kind === "video" ? "video" : "image",
    url: g.output_url,
    name: g.kind === "video" ? [cam, getVideoModel(g.model_id)?.name].filter(Boolean).join(" · ") || "Vídeo IA" : "Mobília virtual",
    thumb: g.kind === "video" ? g.thumbnail_url : g.output_url,
    staged,
  };
}


export function Library({ onAdd }: { onAdd: (item: LibraryItem) => void }) {
  const [tab, setTab] = useState<"gen" | "files">("gen");
  const { items } = useGenerations(5000);
  const [media, setMedia] = useState<MediaFile[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMedia = () => api<{ media: MediaFile[] }>("/api/media").then((r) => setMedia(r.media)).catch(() => setMedia([]));
  useEffect(() => {
    loadMedia();
  }, []);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setTab("files");
    const list = Array.from(files);
    setUploading((n) => n + list.length);
    for (const f of list) {
      try {
        await uploadFile(f);
      } catch (e) {
        alert((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    loadMedia();
  }

  const gens = (items ?? []).filter((g) => g.status !== "failed");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <h2 className="font-display text-lg font-bold">Biblioteca</h2>
        <button onClick={() => fileRef.current?.click()} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/6 px-2.5 text-xs font-semibold hover:bg-white/10" title="Enviar fotos, vídeos ou música">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Enviar
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </div>
      <div className="mx-4 grid grid-cols-2 rounded-xl bg-ink-900 p-1 text-sm">
        <button onClick={() => setTab("gen")} className={`rounded-lg py-1.5 font-medium transition ${tab === "gen" ? "bg-ink-700 text-white" : "text-ink-400"}`}>Gerações</button>
        <button onClick={() => setTab("files")} className={`rounded-lg py-1.5 font-medium transition ${tab === "files" ? "bg-ink-700 text-white" : "text-ink-400"}`}>Meus arquivos</button>
      </div>
      <div
        className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
      >
        {tab === "gen" ? (
          items === null ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-[72px] rounded-xl" />)
          ) : gens.length === 0 ? (
            <Empty text="Suas gerações de IA aparecem aqui." />
          ) : (
            gens.map((g) => <GenRow key={g.id} g={g} onAdd={onAdd} />)
          )
        ) : media === null ? (
          <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-ink-400" />
        ) : media.length === 0 && !uploading ? (
          <Empty text="Arraste fotos, vídeos ou músicas (MP3) aqui." />
        ) : (
          media.map((m) => (
            <Row
              key={m.id}
              icon={m.kind === "audio" ? Music2 : m.kind === "video" ? Film : ImageIcon}
              thumb={m.kind === "image" ? m.url : null}
              video={m.kind === "video" ? m.url : null}
              title={m.name}
              sub={m.kind === "audio" ? "Música · vai para a trilha" : m.kind === "video" ? "Vídeo" : "Foto · vira clipe animado"}
              onAdd={() => onAdd({ kind: m.kind, url: m.url, name: m.name, thumb: m.kind === "image" ? m.url : null })}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GenRow({ g, onAdd }: { g: Generation; onAdd: (i: LibraryItem) => void }) {
  const item = generationToItem(g);
  const p = g.params as { cameraId?: string; duration?: number; room?: string };
  const cam = CAMERA_MOVES.find((c) => c.id === p.cameraId)?.name;
  const title = g.kind === "video" ? cam ?? "Vídeo gerado" : `Mobília · ${p.room ?? "cômodo"}`;
  const model = g.kind === "video" ? getVideoModel(g.model_id)?.name : null;
  return (
    <Row
      icon={g.kind === "video" ? Film : Sofa}
      thumb={g.kind === "staging" ? g.output_url ?? g.thumbnail_url : g.thumbnail_url}
      video={g.kind === "video" && item ? item.url : null}
      title={title}
      sub={item ? [model, p.duration ? `${p.duration}s` : null, new Date(g.created_at).toLocaleDateString("pt-BR")].filter(Boolean).join(" · ") : "Gerando…"}
      loading={!item}
      onAdd={() => item && onAdd(item)}
    />
  );
}

function Row({ icon: Icon, thumb, video, title, sub, onAdd, loading }: { icon: typeof Film; thumb?: string | null; video?: string | null; title: string; sub: string; onAdd: () => void; loading?: boolean }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/6 bg-ink-900 p-2 transition hover:border-white/15">
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-800">
        {video ? (
          <video src={video} muted preload="metadata" className="h-full w-full object-cover" onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
        ) : thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-ink-400"><Icon className="h-5 w-5" /></div>
        )}
        {loading && <div className="absolute inset-0 grid place-items-center bg-black/50"><Loader2 className="h-4 w-4 animate-spin text-lime-400" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{title}</div>
        <div className="truncate text-xs text-ink-400">{sub}</div>
      </div>
      <button
        onClick={onAdd}
        disabled={loading}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/6 text-ink-200 transition hover:bg-lime-400 hover:text-black disabled:opacity-30"
        title="Adicionar à linha do tempo"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-ink-400">{text}</div>;
}
