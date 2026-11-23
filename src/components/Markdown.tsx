// Renderizador mínimo de Markdown (títulos, listas, negrito e links) para as páginas públicas.
import Link from "next/link";
import type { ReactNode } from "react";

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}-${i++}`} className="font-semibold text-white">{m[1]}</strong>);
    else {
      const href = m[3];
      const internal = href.startsWith("/") || href.includes("imobistudioapp.com");
      out.push(
        internal ? (
          <Link key={`${key}-${i++}`} href={href.replace(/^https?:\/\/[^/]+/, "") || "/"} className="font-medium text-lime-400 underline-offset-2 hover:underline">{m[2]}</Link>
        ) : (
          <a key={`${key}-${i++}`} href={href} className="font-medium text-lime-400 underline-offset-2 hover:underline" rel="noreferrer">{m[2]}</a>
        ),
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ md }: { md: string }) {
  const blocks = md.trim().split(/\n{2,}/);
  return (
    <div className="space-y-5 text-[15px] leading-relaxed text-ink-200">
      {blocks.map((b, bi) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^- /.test(l)))
          return <ul key={bi} className="list-disc space-y-1.5 pl-5 marker:text-lime-400">{lines.map((l, li) => <li key={li}>{inline(l.slice(2), `${bi}-${li}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l)))
          return <ol key={bi} className="list-decimal space-y-1.5 pl-5 marker:text-lime-400">{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\d+\. /, ""), `${bi}-${li}`)}</li>)}</ol>;
        return (
          <div key={bi} className="space-y-3">
            {lines.map((l, li) => {
              const k = `${bi}-${li}`;
              if (l.startsWith("# ")) return <h1 key={k} className="font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">{inline(l.slice(2), k)}</h1>;
              if (l.startsWith("## ")) return <h2 key={k} className="pt-4 font-display text-2xl font-bold text-white">{inline(l.slice(3), k)}</h2>;
              if (l.startsWith("### ")) return <h3 key={k} className="pt-2 text-lg font-semibold text-white">{inline(l.slice(4), k)}</h3>;
              if (/^- /.test(l)) return <ul key={k} className="list-disc pl-5 marker:text-lime-400"><li>{inline(l.slice(2), k)}</li></ul>;
              return <p key={k}>{inline(l, k)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}
