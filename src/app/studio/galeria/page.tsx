"use client";
import Link from "next/link";
import { useState } from "react";
import { Download, Film, Loader2, Sofa, Sparkles, Wand2 } from "lucide-react";
import { Badge, Button, Chip } from "@/components/ui";
import { useGenerations } from "@/components/studio/useGenerations";
import { CAMERA_MOVES } from "@/lib/creative";
import { getVideoModel, STAGING_MODELS } from "@/lib/models";

type Filter = "all" | "video" | "staging";

export default function GaleriaPage() {
  const { items } = useGenerations();
  const [filter, setFilter] = useState<Filter>("all");
  const list = (items ?? []).filter((g) => filter === "all" || g.kind === filter);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Galeria</h1>
          <p className="text-sm text-ink-400">Tudo o que você gerou com IA. Os vídeos ficam disponíveis no Editor.</p>
        </div>
        <div className="flex gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>Tudo</Chip>
          <Chip active={filter === "video"} onClick={() => setFilter("video")}>Vídeos</Chip>
          <Chip active={filter === "staging"} onClick={() => setFilter("staging")}>Mobília virtual</Chip>
        </div>
      </div>

      {items === null ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer aspect-video rounded-2xl" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="glass mt-10 flex flex-col items-center rounded-3xl px-6 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-400/10 text-lime-400"><Sparkles /></div>
          <h2 className="mt-4 font-display text-xl font-bold">Nada por aqui ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-400">Crie seu primeiro vídeo a partir de uma foto do imóvel. Leva poucos minutos.</p>
          <Link href="/studio/criar" className="mt-6"><Button variant="primary" size="lg"><Wand2 className="h-4 w-4" /> Criar vídeo</Button></Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((g) => {
            const params = g.params as { cameraId?: string; duration?: number; room?: string };
            const modelName = g.kind === "staging" ? STAGING_MODELS.find((m) => m.id === g.model_id)?.name ?? "Mobília virtual" : getVideoModel(g.model_id)?.name ?? g.model_id;
            return (
              <div key={g.id} className="glass group overflow-hidden rounded-2xl">
                <div className="relative aspect-video bg-ink-850">
                  {g.status === "completed" && g.output_url ? (
                    g.kind === "video" ? (
                      <video
                        src={g.output_url}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.output_url} alt="" className="h-full w-full object-cover" />
                    )
                  ) : g.status === "failed" ? (
                    <div className="grid h-full place-items-center p-4 text-center text-xs text-red-300">Falhou · créditos devolvidos<br /><span className="text-ink-500">{g.error?.slice(0, 120)}</span></div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {g.thumbnail_url && <img src={g.thumbnail_url} alt="" className="h-full w-full object-cover opacity-30" />}
                      <div className="absolute inset-0 grid place-items-center"><span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs backdrop-blur"><Loader2 className="h-3.5 w-3.5 animate-spin text-lime-400" /> Gerando…</span></div>
                    </>
                  )}
                  <span className="absolute left-2 top-2">
                    {g.kind === "video" ? <Badge tone="lime"><Film className="h-3 w-3" /> Vídeo</Badge> : <Badge tone="violet"><Sofa className="h-3 w-3" /> Mobília</Badge>}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{modelName}{params.duration ? ` · ${params.duration}s` : ""}</div>
                    <div className="truncate text-xs text-ink-400">
                      {g.kind === "video" ? CAMERA_MOVES.find((c) => c.id === params.cameraId)?.name : params.room} · {g.credits_cost} créditos · {new Date(g.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  {g.output_url && (
                    <a href={g.output_url} download target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 hover:bg-white/5 hover:text-white" title="Baixar">
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
