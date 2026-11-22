"use client";
// Faixa de alerta visível só para o dono do app (ADMIN_EMAILS).
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

type Status = {
  kie: { configured: boolean; credits: number | null; usd: number | null; low: boolean; error?: string };
  thresholdUsd: number;
  payments: boolean;
};

export function AdminAlert() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/admin/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && setS(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  if (!s) return null;

  const items: React.ReactNode[] = [];
  if (s.kie.configured && s.kie.error) items.push(<>Não foi possível consultar o saldo do Kie.ai ({s.kie.error}).</>);
  else if (s.kie.low && s.kie.usd !== null)
    items.push(
      <>
        Saldo do Kie.ai baixo: <b>US$ {s.kie.usd.toFixed(2)}</b> (alerta abaixo de US$ {s.thresholdUsd}).{" "}
        {s.kie.usd < 0.7 ? "Os clientes já não conseguem gerar vídeos." : "Recarregue para não interromper as gerações."}
      </>,
    );
  if (!s.payments) items.push(<>Pix não configurado: clientes não conseguem comprar créditos.</>);
  if (!items.length) return null;

  return (
    <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[13px] text-amber-200">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
        {items.map((it, i) => <span key={i}>{it}</span>)}
        {s.kie.low && (
          <a href="https://kie.ai/billing" target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-semibold text-amber-100 underline">
            Recarregar Kie.ai <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
