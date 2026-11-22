"use client";
import { useRef, useState } from "react";
import { Building2, Check, Clapperboard, ImagePlus, UserRound } from "lucide-react";
import { Button, Field, inputCls } from "@/components/ui";
import { useStudio } from "@/components/studio/StudioContext";
import { api, uploadFile } from "@/lib/client";
import type { AccountType, Profile } from "@/lib/store/types";

const TYPES: { id: AccountType; label: string; icon: typeof Building2 }[] = [
  { id: "imobiliaria", label: "Imobiliária", icon: Building2 },
  { id: "corretor", label: "Corretor(a)", icon: UserRound },
  { id: "editor", label: "Prestador de serviço", icon: Clapperboard },
];
const COLORS = ["#C6F432", "#22D3EE", "#9B8CFF", "#F97316", "#F43F5E", "#FACC15", "#10B981", "#FFFFFF"];

export default function ContaPage() {
  const { profile, setProfile } = useStudio();
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    account_type: profile.account_type,
    company_name: profile.company_name ?? "",
    creci: profile.creci ?? "",
    whatsapp: profile.whatsapp ?? "",
    brand_color: profile.brand_color,
    logo_url: profile.logo_url,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    setSaving(true);
    try {
      const r = await api<{ profile: Profile }>("/api/profile", { method: "PATCH", json: form });
      setProfile(r.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <h1 className="font-display text-4xl font-extrabold">Conta e marca</h1>
      <p className="mt-1 text-ink-400">Esses dados aparecem automaticamente nos seus vídeos (logo, CRECI e WhatsApp).</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="glass space-y-5 rounded-3xl p-6">
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink-200">Tipo de conta</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {TYPES.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setForm({ ...form, account_type: id })} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${form.account_type === id ? "border-lime-400 bg-lime-400/10 text-lime-300" : "border-white/8 text-ink-300 hover:border-white/20"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome"><input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Empresa / imobiliária"><input className={inputCls} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></Field>
            <Field label="CRECI"><input className={inputCls} value={form.creci} onChange={(e) => setForm({ ...form, creci: e.target.value })} /></Field>
            <Field label="WhatsApp"><input className={inputCls} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
          </div>
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink-200">Cor da marca</div>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, brand_color: c })} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10" style={{ background: c }}>
                  {form.brand_color.toLowerCase() === c.toLowerCase() && <Check className="h-4 w-4 text-black" strokeWidth={3} />}
                </button>
              ))}
              <input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-xl border border-white/10 bg-transparent" />
            </div>
          </div>
          <Button variant="primary" size="lg" loading={saving} onClick={save}>{saved ? <><Check className="h-4 w-4" /> Salvo</> : "Salvar alterações"}</Button>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-3xl p-5">
            <div className="mb-3 text-[13px] font-medium text-ink-200">Logo</div>
            <button onClick={() => fileRef.current?.click()} className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-ink-900 hover:border-white/25">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="" className="max-h-[70%] max-w-[70%] object-contain" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm text-ink-400"><ImagePlus className="h-6 w-6" />{uploading ? "Enviando…" : "Enviar logo (PNG transparente)"}</span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              try {
                const r = await uploadFile(f, { register: false });
                setForm((s) => ({ ...s, logo_url: r.url }));
              } finally {
                setUploading(false);
              }
            }} />
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/8">
            <div className="relative aspect-[9/12] bg-[linear-gradient(160deg,#2a313c,#0c0e12)]">
              <div className="absolute left-3 top-3 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {form.logo_url && <img src={form.logo_url} alt="" className="h-8 w-8 rounded-md object-contain" />}
                <span className="text-xs font-bold drop-shadow">{form.company_name || form.full_name}</span>
              </div>
              <div className="absolute inset-x-3 bottom-3 rounded-xl p-3 text-black" style={{ background: form.brand_color }}>
                <div className="text-[11px] font-bold opacity-70">PRÉVIA DA MARCA</div>
                <div className="text-sm font-extrabold">{form.whatsapp || "(11) 99999-9999"}</div>
                {form.creci && <div className="text-[11px] font-semibold opacity-80">CRECI {form.creci}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
