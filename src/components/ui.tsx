"use client";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  loading,
  children,
  className = "",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: "sm" | "md" | "lg" }) {
  const v: Record<Variant, string> = {
    primary: "bg-lime-400 text-black hover:bg-lime-300 shadow-[0_8px_30px_-8px_rgba(198,244,50,0.6)] disabled:bg-ink-600 disabled:text-ink-400 disabled:shadow-none",
    secondary: "bg-ink-800 text-ink-100 border border-white/8 hover:bg-ink-700 hover:border-white/15 disabled:opacity-50",
    ghost: "text-ink-300 hover:text-ink-100 hover:bg-white/5 disabled:opacity-40",
    danger: "bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20",
  };
  const s = { sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5", md: "h-10 px-4 text-sm rounded-xl gap-2", lg: "h-12 px-6 text-[15px] rounded-xl gap-2.5" }[size];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed ${v[variant]} ${s} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-11 rounded-xl bg-ink-900 border border-white/8 px-3.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none transition focus:border-lime-400/70 focus:ring-4 focus:ring-lime-400/10";

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full border px-3.5 text-[13px] font-medium transition ${
        active ? "border-lime-400 bg-lime-400/10 text-lime-300" : "border-white/8 bg-ink-850 text-ink-300 hover:border-white/20 hover:text-ink-100"
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "lime" | "violet" | "red" | "amber" }) {
  const t = {
    neutral: "bg-white/6 text-ink-300 border-white/8",
    lime: "bg-lime-400/12 text-lime-300 border-lime-400/30",
    violet: "bg-violet-400/12 text-violet-400 border-violet-400/30",
    red: "bg-red-500/12 text-red-300 border-red-500/30",
    amber: "bg-amber-400/12 text-amber-300 border-amber-400/30",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${t}`}>{children}</span>;
}
