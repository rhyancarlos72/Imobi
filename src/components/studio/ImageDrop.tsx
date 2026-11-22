"use client";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { useRef, useState } from "react";
import { uploadFile } from "@/lib/client";

export function ImageDrop({
  label,
  sub,
  value,
  onChange,
  aspect = "aspect-[4/3]",
}: {
  label: string;
  sub?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  async function handle(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Envie uma imagem (JPG, PNG ou WebP).");
    setBusy(true);
    setError("");
    try {
      const r = await uploadFile(file);
      onChange(r.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink-100">{label}</span>
        {sub && <span className="text-xs text-ink-400">{sub}</span>}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={`group relative ${aspect} overflow-hidden rounded-2xl border-2 border-dashed transition ${
          drag ? "border-lime-400 bg-lime-400/5" : value ? "border-transparent" : "border-white/10 bg-ink-900 hover:border-white/25"
        }`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => input.current?.click()} className="flex h-8 items-center gap-1.5 rounded-lg bg-black/60 px-3 text-xs font-semibold backdrop-blur hover:bg-black/80"><RefreshCw className="h-3.5 w-3.5" /> Trocar</button>
              <button onClick={() => onChange(null)} className="grid h-8 w-8 place-items-center rounded-lg bg-black/60 backdrop-blur hover:bg-black/80"><X className="h-4 w-4" /></button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            {busy ? (
              <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-800 text-ink-300 transition group-hover:bg-lime-400 group-hover:text-black"><ImagePlus className="h-6 w-6" /></span>
            )}
            <span className="text-sm font-medium text-ink-200">{busy ? "Enviando..." : "Arraste a foto aqui ou clique"}</span>
            <span className="text-xs text-ink-500">JPG, PNG ou WebP · de preferência na horizontal</span>
          </button>
        )}
        {busy && value && <div className="absolute inset-0 grid place-items-center bg-black/50"><Loader2 className="h-8 w-8 animate-spin text-lime-400" /></div>}
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0] ?? undefined)} />
    </div>
  );
}
