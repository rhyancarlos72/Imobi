"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Check, Clapperboard, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, Field, inputCls } from "@/components/ui";
import { api } from "@/lib/client";

type Acc = "imobiliaria" | "corretor" | "editor";

const TYPES: { id: Acc; title: string; desc: string; icon: typeof Building2 }[] = [
  { id: "imobiliaria", title: "Imobiliária", desc: "Equipe com vários imóveis e corretores", icon: Building2 },
  { id: "corretor", title: "Corretor(a)", desc: "Autônomo divulgando os próprios imóveis", icon: UserRound },
  { id: "editor", title: "Prestador de serviço", desc: "Faço vídeos de imóveis para clientes", icon: Clapperboard },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<Acc | null>(null);
  const [form, setForm] = useState({ full_name: "", company_name: "", creci: "", whatsapp: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await api<{ needsConfirmation: boolean }>("/api/auth/signup", { json: { ...form, account_type: type } });
      if (r.needsConfirmation) setDone(true);
      else {
        router.push("/studio/criar");
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-lime-400 text-black"><Check /></div>
          <h1 className="font-display text-2xl font-bold">Confirme seu e-mail</h1>
          <p className="mt-2 text-ink-300">Enviamos um link para <b>{form.email}</b>. Depois de confirmar, você já ganha 9 créditos para testar.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-8 inline-block"><Logo /></Link>
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-lime-400">Etapa {step} de 2</div>
        {step === 1 ? (
          <>
            <h1 className="font-display text-3xl font-bold">Como você vai usar o estúdio?</h1>
            <p className="mt-1 text-sm text-ink-400">A gente ajusta modelos, textos e sugestões para o seu perfil.</p>
            <div className="mt-7 space-y-3">
              {TYPES.map(({ id, title, desc, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setType(id)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                    type === id ? "border-lime-400 bg-lime-400/[0.06] glow-lime" : "border-white/8 bg-ink-900 hover:border-white/20"
                  }`}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${type === id ? "bg-lime-400 text-black" : "bg-ink-800 text-ink-300"}`}><Icon className="h-5 w-5" /></span>
                  <span className="flex-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-ink-400">{desc}</span>
                  </span>
                  <span className={`grid h-5 w-5 place-items-center rounded-full border ${type === id ? "border-lime-400 bg-lime-400 text-black" : "border-white/20"}`}>
                    {type === id && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>
            <Button variant="primary" size="lg" className="mt-7 w-full" disabled={!type} onClick={() => setStep(2)}>Continuar</Button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 className="font-display text-3xl font-bold">Seus dados</h1>
            <p className="mt-1 text-sm text-ink-400">Usamos nome, CRECI e WhatsApp na marca dos seus vídeos.</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Seu nome"><input className={inputCls} value={form.full_name} onChange={set("full_name")} required minLength={2} /></Field></div>
              <Field label={type === "editor" ? "Nome do seu negócio" : type === "imobiliaria" ? "Nome da imobiliária" : "Imobiliária (opcional)"}>
                <input className={inputCls} value={form.company_name} onChange={set("company_name")} required={type === "imobiliaria"} />
              </Field>
              {type !== "editor" ? (
                <Field label="CRECI (opcional)"><input className={inputCls} value={form.creci} onChange={set("creci")} placeholder="Ex.: 12345-F" /></Field>
              ) : <div className="hidden sm:block" />}
              <Field label="WhatsApp"><input className={inputCls} value={form.whatsapp} onChange={set("whatsapp")} placeholder="(11) 99999-9999" /></Field>
              <Field label="E-mail"><input className={inputCls} type="email" value={form.email} onChange={set("email")} required autoComplete="email" /></Field>
              <div className="sm:col-span-2"><Field label="Senha" hint="Mínimo de 6 caracteres"><input className={inputCls} type="password" value={form.password} onChange={set("password")} required minLength={6} autoComplete="new-password" /></Field></div>
            </div>
            {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <div className="mt-7 flex gap-3">
              <Button type="button" size="lg" onClick={() => setStep(1)}>Voltar</Button>
              <Button variant="primary" size="lg" className="flex-1" loading={loading}>Criar conta e ganhar 9 créditos</Button>
            </div>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-ink-400">
          Já tem conta? <Link href="/entrar" className="font-semibold text-lime-400 hover:underline">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
