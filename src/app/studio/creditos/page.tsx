"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Coins, Copy, Loader2, QrCode, X, Zap } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { useStudio } from "@/components/studio/StudioContext";
import { api } from "@/lib/client";
import { CREDIT_PACKAGES, formatBRL, videoCredits } from "@/lib/pricing";
import { VIDEO_MODELS } from "@/lib/models";
import type { CreditTransaction, Payment } from "@/lib/store/types";

export default function CreditosPage() {
  const { credits, setCredits, pricing, demo } = useStudio();
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const ref = VIDEO_MODELS.find((m) => m.recommended) ?? VIDEO_MODELS[0];
  const per5s = videoCredits(ref, 5, false, pricing);

  const loadHistory = useCallback(() => api<{ transactions: CreditTransaction[] }>("/api/credits/history").then((r) => setHistory(r.transactions)).catch(() => {}), []);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function buy(id: string) {
    setLoadingPkg(id);
    setError("");
    try {
      const r = await api<{ payment: Payment }>("/api/credits/checkout", { json: { packageId: id } });
      setPayment(r.payment);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingPkg(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold">Créditos</h1>
          <p className="mt-1 text-ink-400">Compre com Pix e use em qualquer modelo. Sem mensalidade, os créditos não expiram.</p>
        </div>
        <div className="glass flex items-center gap-4 rounded-2xl px-5 py-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-400 text-black"><Coins className="h-5 w-5" /></div>
          <div>
            <div className="text-xs text-ink-400">Seu saldo</div>
            <div className="font-display text-2xl font-bold tabular-nums">{credits} créditos</div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {CREDIT_PACKAGES.map((p) => {
          const total = p.credits + p.bonus;
          return (
            <div key={p.id} className={`relative flex flex-col rounded-3xl border p-6 ${p.highlight ? "border-lime-400/70 bg-lime-400/[0.04] glow-lime" : "glass"}`}>
              {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-lime-400 px-3 py-1 text-xs font-bold text-black">Mais escolhido</span>}
              <div className="text-sm font-semibold text-ink-300">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold tabular-nums">{total}</span>
                <span className="text-ink-400">créditos</span>
              </div>
              {p.bonus > 0 && <div className="mt-2"><Badge tone="lime">+{p.bonus} de bônus</Badge></div>}
              <p className="mt-3 text-sm text-ink-400">{p.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-ink-200">
                <li className="flex gap-2"><Check className="h-4 w-4 text-lime-400" /> ~{Math.floor(total / per5s)} vídeos de 5s ({ref.name})</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-lime-400" /> Mobília virtual e todos os modelos</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-lime-400" /> Reembolso automático se a IA falhar</li>
              </ul>
              <div className="mt-auto pt-6">
                <div className="mb-3 font-display text-2xl font-bold">{formatBRL(p.priceCents)}</div>
                <Button variant={p.highlight ? "primary" : "secondary"} size="lg" className="w-full" loading={loadingPkg === p.id} onClick={() => buy(p.id)}>
                  <QrCode className="h-4 w-4" /> Pagar com Pix
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <section className="mt-14">
        <h2 className="font-display text-xl font-bold">Histórico</h2>
        <div className="glass mt-4 divide-y divide-white/6 overflow-hidden rounded-2xl">
          {history.length === 0 && <div className="p-6 text-sm text-ink-400">Nenhuma movimentação ainda.</div>}
          {history.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{t.description}</div>
                <div className="text-xs text-ink-500">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <span className={`font-semibold tabular-nums ${t.amount > 0 ? "text-lime-300" : "text-ink-300"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</span>
            </div>
          ))}
        </div>
      </section>

      {payment && (
        <PixModal
          payment={payment}
          demo={demo.payments}
          onClose={() => setPayment(null)}
          onPaid={(c) => {
            setCredits(c);
            loadHistory();
          }}
        />
      )}
    </div>
  );
}

function PixModal({ payment, demo, onClose, onPaid }: { payment: Payment; demo: boolean; onClose: () => void; onPaid: (credits: number) => void }) {
  const [p, setP] = useState(payment);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const r = await api<{ payment: Payment; credits: number }>(`/api/credits/payments/${payment.id}`);
      setP(r.payment);
      if (r.payment.status === "paid") return onPaid(r.credits);
      if (r.payment.status !== "pending") return;
    } catch {}
    timer.current = setTimeout(poll, 3000);
  }, [payment.id, onPaid]);

  useEffect(() => {
    timer.current = setTimeout(poll, 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  async function simulate() {
    setSimulating(true);
    await api(`/api/credits/payments/${payment.id}/simulate`, { method: "POST" }).catch(() => {});
    if (timer.current) clearTimeout(timer.current);
    await poll();
    setSimulating(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="fade-up w-full max-w-md rounded-3xl border border-white/10 bg-ink-850 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-lime-400">Pix · {formatBRL(p.amount_cents)}</div>
            <h3 className="mt-1 font-display text-2xl font-bold">{p.status === "paid" ? "Pagamento confirmado!" : `${p.credits} créditos`}</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        {p.status === "paid" ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-lime-400" />
            <p className="mt-4 text-ink-300">{p.credits} créditos foram adicionados à sua conta.</p>
            <Button variant="primary" size="lg" className="mt-6 w-full" onClick={onClose}>Continuar criando</Button>
          </div>
        ) : p.status === "expired" ? (
          <div className="py-10 text-center text-ink-300">Este Pix expirou. Gere um novo.</div>
        ) : (
          <>
            <div className="mt-5 grid place-items-center rounded-2xl bg-white p-4">
              {p.qr_code_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.qr_code_image} alt="QR Code Pix" className="h-56 w-56" />
              ) : (
                <div className="grid h-56 w-56 place-items-center text-center text-sm text-ink-700">
                  <QrCode className="h-24 w-24 text-black" />
                  {demo ? "QR Code de demonstração" : "Use o Pix copia e cola"}
                </div>
              )}
            </div>
            {p.br_code && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(p.br_code!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-4 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-left hover:border-white/20"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-300">{p.br_code}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-lime-400">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copiado" : "Copiar"}</span>
              </button>
            )}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-400"><Loader2 className="h-4 w-4 animate-spin" /> Aguardando pagamento… a confirmação é automática.</div>
            {p.payment_link && <a href={p.payment_link} target="_blank" rel="noreferrer" className="mt-2 block text-center text-xs text-ink-400 underline">Abrir página de pagamento</a>}
            {demo && (
              <Button className="mt-5 w-full" onClick={simulate} loading={simulating}><Zap className="h-4 w-4" /> Simular pagamento (demo)</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
