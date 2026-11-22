"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button, Field, inputCls } from "@/components/ui";
import { api } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("confirmado")) setNotice("E-mail confirmado! Entre com seu e-mail e senha.");
    if (q.get("erro")) setNotice("O link expirou ou já foi usado. Tente entrar com seu e-mail e senha.");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/login", { json: { email, password } });
      router.push("/studio/criar");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block"><Logo /></Link>
        <h1 className="font-display text-3xl font-bold">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-ink-400">Entre para continuar criando seus vídeos.</p>
        {notice && <p className="mt-6 rounded-lg bg-lime-400/10 px-3 py-2 text-sm text-lime-300">{notice}</p>}
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="E-mail"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
          <Field label="Senha"><input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></Field>
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <Button variant="primary" size="lg" className="w-full" loading={loading}>Entrar</Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-400">
          Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-lime-400 hover:underline">Criar conta grátis</Link>
        </p>
      </div>
    </main>
  );
}
