"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Coins,
  CreditCard,
  Film,
  LayoutDashboard,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge, Button, inputCls } from "@/components/ui";
import { api } from "@/lib/client";
import { getVideoModel, STAGING_MODELS } from "@/lib/models";
import { formatBRL } from "@/lib/pricing";
import type { AdminStats, AdminUser, CreditTransaction, Generation, Payment, Profile } from "@/lib/store/types";

type Tab = "overview" | "users" | "payments" | "generations";

const ACC: Record<string, string> = { imobiliaria: "Imobiliária", corretor: "Corretor(a)", editor: "Prestador" };
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const modelName = (g: Generation) => (g.kind === "staging" ? STAGING_MODELS.find((m) => m.id === g.model_id)?.name ?? "Mobília" : getVideoModel(g.model_id)?.name ?? g.model_id);

export function AdminPanel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [gens, setGens] = useState<Generation[] | null>(null);
  const [overview, setOverview] = useState<{ stats: AdminStats; kieUsd: number | null } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, u, p, g] = await Promise.all([
        api<{ stats: AdminStats; kieUsd: number | null }>("/api/admin/overview"),
        api<{ users: AdminUser[] }>("/api/admin/users"),
        api<{ payments: Payment[] }>("/api/admin/payments"),
        api<{ generations: Generation[] }>("/api/admin/generations"),
      ]);
      setOverview(o);
      setUsers(u.users);
      setPayments(p.payments);
      setGens(g.generations);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);
  const who = (id: string) => {
    const u = userById.get(id);
    return u ? u.full_name || u.email || id.slice(0, 8) : id.slice(0, 8);
  };

  const TABS: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "users", label: "Usuários", icon: Users, count: users?.length },
    { id: "payments", label: "Pagamentos", icon: CreditCard, count: payments?.length },
    { id: "generations", label: "Gerações", icon: Film, count: gens?.length },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 md:px-6">
          <Link href="/studio/criar"><Logo withText={false} /></Link>
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            Painel admin <Badge tone="violet"><ShieldCheck className="h-3 w-3" /> {email}</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={load} loading={loading}><RefreshCw className="h-3.5 w-3.5" /> Atualizar</Button>
            <Link href="/studio/criar"><Button size="sm" variant="ghost"><ArrowLeft className="h-3.5 w-3.5" /> Voltar ao app</Button></Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 pb-2 md:px-6">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${tab === id ? "bg-white/8 text-white" : "text-ink-400 hover:bg-white/4 hover:text-ink-100"}`}
            >
              <Icon className={`h-4 w-4 ${tab === id ? "text-lime-400" : ""}`} /> {label}
              {count !== undefined && <span className="rounded-md bg-white/8 px-1.5 text-[11px] tabular-nums">{count}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        {error && <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        {!overview && loading && <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-lime-400" /></div>}

        {tab === "overview" && overview && <Overview data={overview} payments={payments ?? []} users={users ?? []} who={who} />}
        {tab === "users" && users && <UsersTab users={users} onOpen={setSelected} />}
        {tab === "payments" && payments && <PaymentsTab payments={payments} who={who} onChanged={load} />}
        {tab === "generations" && gens && <GenerationsTab gens={gens} who={who} />}
      </main>

      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onChanged={(patch) => {
            setUsers((us) => (us ?? []).map((u) => (u.id === selected.id ? { ...u, ...patch } : u)));
            setSelected((s) => (s ? { ...s, ...patch } : s));
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ visão geral
function Stat({ label, value, sub, icon: Icon, tone = "lime" }: { label: string; value: string; sub?: string; icon: typeof Users; tone?: "lime" | "violet" | "amber" | "red" }) {
  const t = { lime: "bg-lime-400/10 text-lime-400", violet: "bg-violet-400/10 text-violet-400", amber: "bg-amber-400/10 text-amber-300", red: "bg-red-500/10 text-red-300" }[tone];
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-400">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${t}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

function Overview({ data, payments, users, who }: { data: { stats: AdminStats; kieUsd: number | null }; payments: Payment[]; users: AdminUser[]; who: (id: string) => string }) {
  const s = data.stats;
  const failRate = s.generations ? Math.round((s.generationsFailed / s.generations) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Faturamento total" value={formatBRL(s.revenueCents)} sub={`${formatBRL(s.revenueLast30dCents)} nos últimos 30 dias · ${s.paidPayments} Pix pagos`} icon={Coins} />
        <Stat label="Usuários" value={String(s.users)} sub={`+${s.usersLast7d} nos últimos 7 dias`} icon={Users} tone="violet" />
        <Stat label="Gerações" value={String(s.generations)} sub={`${s.generationsLast7d} nos últimos 7 dias · ${failRate}% com falha`} icon={Film} tone={failRate > 20 ? "red" : "lime"} />
        <Stat
          label="Saldo no Kie.ai"
          value={data.kieUsd === null ? "—" : `US$ ${data.kieUsd.toFixed(2)}`}
          sub={data.kieUsd !== null && data.kieUsd < 5 ? "Saldo baixo: recarregue em kie.ai" : "Custo de IA pré-pago"}
          icon={data.kieUsd !== null && data.kieUsd < 5 ? AlertTriangle : CheckCircle2}
          tone={data.kieUsd !== null && data.kieUsd < 5 ? "amber" : "lime"}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Créditos vendidos" value={String(s.creditsSold)} icon={CreditCard} tone="violet" />
        <Stat label="Créditos usados em vídeos" value={String(s.creditsSpent)} icon={Film} tone="violet" />
        <Stat label="Créditos em saldo dos clientes" value={String(s.creditsBalance)} sub={`${s.pendingPayments} Pix aguardando pagamento`} icon={Coins} tone="violet" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-semibold">Últimos pagamentos</h3>
          <ul className="divide-y divide-white/6 text-sm">
            {payments.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{who(p.user_id)}</span>
                <span className="flex shrink-0 items-center gap-2"><StatusBadge status={p.status} /> <b className="tabular-nums">{formatBRL(p.amount_cents)}</b></span>
              </li>
            ))}
            {!payments.length && <li className="py-2 text-ink-500">Nenhum pagamento ainda.</li>}
          </ul>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-semibold">Últimos cadastros</h3>
          <ul className="divide-y divide-white/6 text-sm">
            {users.slice(0, 8).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{u.full_name || "—"} <span className="text-ink-500">{u.email}</span></span>
                <span className="shrink-0 text-xs text-ink-400">{fmtDate(u.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, "lime" | "amber" | "red" | "neutral" | "violet"]> = {
    paid: ["Pago", "lime"],
    pending: ["Pendente", "amber"],
    expired: ["Expirado", "neutral"],
    failed: ["Falhou", "red"],
    completed: ["Pronto", "lime"],
    processing: ["Gerando", "violet"],
    queued: ["Na fila", "violet"],
  };
  const [label, tone] = map[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}

// ------------------------------------------------------------------ usuários
function UsersTab({ users, onOpen }: { users: AdminUser[]; onOpen: (u: AdminUser) => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "paid" | "credits">("recent");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = users.filter((u) => !t || [u.full_name, u.email, u.company_name, u.whatsapp, u.creci].some((v) => v?.toLowerCase().includes(t)));
    if (sort === "paid") f.sort((a, b) => b.paid_cents - a.paid_cents);
    else if (sort === "credits") f.sort((a, b) => b.credits - a.credits);
    return f;
  }, [users, q, sort]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className={`${inputCls} pl-9`} placeholder="Buscar por nome, e-mail, empresa, WhatsApp ou CRECI" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={`${inputCls} w-auto`}>
          <option value="recent">Mais recentes</option>
          <option value="paid">Quem mais pagou</option>
          <option value="credits">Mais créditos</option>
        </select>
      </div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/6 text-xs uppercase tracking-wider text-ink-400">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3 text-right">Créditos</th>
              <th className="px-4 py-3 text-right">Pagou</th>
              <th className="px-4 py-3 text-right">Vídeos</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.full_name || "—"} {u.banned && <Badge tone="red">Bloqueado</Badge>}</div>
                  <div className="text-xs text-ink-400">{u.email}{u.company_name ? ` · ${u.company_name}` : ""}</div>
                </td>
                <td className="px-4 py-3 text-ink-300">{ACC[u.account_type] ?? u.account_type}</td>
                <td className="px-4 py-3 text-ink-300">{u.whatsapp ? <a className="hover:text-lime-300" href={`https://wa.me/55${u.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noreferrer">{u.whatsapp}</a> : "—"}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{u.credits}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.paid_cents ? formatBRL(u.paid_cents) : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.generations}</td>
                <td className="px-4 py-3 text-xs text-ink-400">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" onClick={() => onOpen(u)}>Gerenciar</Button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-500">Nenhum usuário encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserDrawer({ user, onClose, onChanged }: { user: AdminUser; onClose: () => void; onChanged: (p: Partial<AdminUser>) => void }) {
  const [detail, setDetail] = useState<{ transactions: CreditTransaction[]; generations: Generation[]; profile: Profile } | null>(null);
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadDetail = useCallback(() => api<{ transactions: CreditTransaction[]; generations: Generation[]; profile: Profile }>(`/api/admin/users/${user.id}`).then(setDetail).catch((e) => setMsg(e.message)), [user.id]);
  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function adjust(sign: 1 | -1) {
    if (!amount) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ credits: number }>(`/api/admin/users/${user.id}`, { json: { action: "credits", delta: sign * amount, reason } });
      onChanged({ credits: r.credits });
      setMsg(`${sign > 0 ? "Adicionados" : "Removidos"} ${amount} créditos. Saldo: ${r.credits}.`);
      setReason("");
      loadDetail();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBan() {
    if (!confirm(user.banned ? "Desbloquear este usuário?" : "Bloquear este usuário? Ele não conseguirá mais entrar no app.")) return;
    setBusy(true);
    try {
      await api(`/api/admin/users/${user.id}`, { json: { action: "ban", banned: !user.banned } });
      onChanged({ banned: !user.banned });
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <aside className="fade-up h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-ink-900 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">{user.full_name || "Sem nome"}</h2>
            <p className="text-sm text-ink-400">{user.email}</p>
            <p className="mt-1 text-xs text-ink-500">
              {ACC[user.account_type]}{user.company_name ? ` · ${user.company_name}` : ""}{user.creci ? ` · CRECI ${user.creci}` : ""} · último acesso {fmtDate(user.last_sign_in_at)}
            </p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="glass rounded-xl p-3"><div className="text-xs text-ink-400">Créditos</div><div className="font-display text-2xl font-bold tabular-nums">{user.credits}</div></div>
          <div className="glass rounded-xl p-3"><div className="text-xs text-ink-400">Pagou</div><div className="font-display text-lg font-bold tabular-nums">{formatBRL(user.paid_cents)}</div></div>
          <div className="glass rounded-xl p-3"><div className="text-xs text-ink-400">Vídeos</div><div className="font-display text-2xl font-bold tabular-nums">{user.generations}</div></div>
        </div>

        <section className="glass mt-5 rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold">Ajustar créditos</h3>
          <div className="flex items-center gap-2">
            <input type="number" min={1} className={`${inputCls} w-28`} value={amount} onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value))))} />
            <Button variant="primary" onClick={() => adjust(1)} loading={busy}><Plus className="h-4 w-4" /> Adicionar</Button>
            <Button variant="danger" onClick={() => adjust(-1)} disabled={busy}><Minus className="h-4 w-4" /> Remover</Button>
          </div>
          <input className={`${inputCls} mt-2`} placeholder="Motivo (opcional): cortesia, reembolso, teste..." value={reason} onChange={(e) => setReason(e.target.value)} />
          {msg && <p className="mt-2 text-xs text-lime-300">{msg}</p>}
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-sm font-semibold">Histórico de créditos</h3>
          <ul className="glass divide-y divide-white/6 rounded-2xl text-sm">
            {!detail && <li className="p-4"><Loader2 className="h-4 w-4 animate-spin text-ink-400" /></li>}
            {detail?.transactions.map((t) => (
              <li key={String(t.id)} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate">{t.description}</span>
                  <span className="text-xs text-ink-500">{fmtDate(t.created_at)}</span>
                </span>
                <b className={`tabular-nums ${t.amount > 0 ? "text-lime-300" : "text-ink-300"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</b>
              </li>
            ))}
            {detail && !detail.transactions.length && <li className="px-4 py-3 text-ink-500">Sem movimentações.</li>}
          </ul>
        </section>

        {detail && detail.generations.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">Últimas gerações</h3>
            <div className="grid grid-cols-3 gap-2">
              {detail.generations.slice(0, 9).map((g) => (
                <a key={g.id} href={g.output_url ?? undefined} target="_blank" rel="noreferrer" className="relative aspect-video overflow-hidden rounded-lg bg-ink-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {g.thumbnail_url && <img src={g.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute bottom-1 left-1"><StatusBadge status={g.status} /></span>
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 border-t border-white/6 pt-4">
          <Button variant={user.banned ? "secondary" : "danger"} onClick={toggleBan} disabled={busy} className="w-full">
            <Ban className="h-4 w-4" /> {user.banned ? "Desbloquear acesso" : "Bloquear acesso"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ pagamentos
function PaymentsTab({ payments, who, onChanged }: { payments: Payment[]; who: (id: string) => string; onChanged: () => void }) {
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const list = payments.filter((p) => filter === "all" || p.status === filter);

  async function act(p: Payment, action: "sync" | "mark-paid") {
    if (action === "mark-paid" && !confirm(`Confirmar manualmente o pagamento de ${formatBRL(p.amount_cents)} e creditar ${p.credits} créditos para ${who(p.user_id)}? Use só se você conferiu o Pix no extrato.`)) return;
    setBusy(p.id);
    try {
      await api(`/api/admin/payments/${p.id}`, { json: { action } });
      onChanged();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["all", "paid", "pending"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`h-9 rounded-full border px-3.5 text-sm ${filter === f ? "border-lime-400 bg-lime-400/10 text-lime-300" : "border-white/8 text-ink-300"}`}>
            {{ all: "Todos", paid: "Pagos", pending: "Pendentes" }[f]}
          </button>
        ))}
      </div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-white/6 text-xs uppercase tracking-wider text-ink-400">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Pacote</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Provedor</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3">Pago em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">{who(p.user_id)}</td>
                <td className="px-4 py-3 text-ink-300">{p.package_id} · {p.credits} cr</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatBRL(p.amount_cents)}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-ink-400">{p.provider}</td>
                <td className="px-4 py-3 text-xs text-ink-400">{fmtDate(p.created_at)}</td>
                <td className="px-4 py-3 text-xs text-ink-400">{fmtDate(p.paid_at)}</td>
                <td className="px-4 py-3 text-right">
                  {p.status === "pending" && (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => act(p, "sync")} loading={busy === p.id}><RefreshCw className="h-3.5 w-3.5" /> Conferir</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(p, "mark-paid")} disabled={busy === p.id}>Marcar pago</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-500">Nenhum pagamento.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ gerações
function GenerationsTab({ gens, who }: { gens: Generation[]; who: (id: string) => string }) {
  const [onlyFailed, setOnlyFailed] = useState(false);
  const list = gens.filter((g) => !onlyFailed || g.status === "failed");
  return (
    <div>
      <label className="mb-4 flex items-center gap-2 text-sm text-ink-300">
        <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} /> Só as que falharam
      </label>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/6 text-xs uppercase tracking-wider text-ink-400">
            <tr>
              <th className="px-4 py-3">Prévia</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Créditos</th>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Erro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((g) => (
              <tr key={g.id}>
                <td className="px-4 py-2">
                  <a href={g.output_url ?? undefined} target="_blank" rel="noreferrer" className="block h-10 w-16 overflow-hidden rounded-md bg-ink-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {g.thumbnail_url && <img src={g.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                  </a>
                </td>
                <td className="px-4 py-2">{who(g.user_id)}</td>
                <td className="px-4 py-2 text-ink-300">{modelName(g)}</td>
                <td className="px-4 py-2"><StatusBadge status={g.status} /></td>
                <td className="px-4 py-2 text-right tabular-nums">{g.credits_cost}</td>
                <td className="px-4 py-2 text-xs text-ink-400">{fmtDate(g.created_at)}</td>
                <td className="max-w-[280px] truncate px-4 py-2 text-xs text-red-300" title={g.error ?? ""}>{g.error ?? ""}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-500">Nada por aqui.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
