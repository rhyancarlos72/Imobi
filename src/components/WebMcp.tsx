"use client";
// WebMCP: expõe ferramentas para agentes de IA rodando no navegador
// (navigator.modelContext.registerTool). Se o navegador não suportar, não faz nada.
import { useEffect } from "react";

type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<{ content: { type: "text"; text: string }[] }>;
};
type ModelContext = { registerTool?: (t: ToolDef) => unknown; unregisterTool?: (name: string) => unknown };

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

async function md(path: string) {
  const r = await fetch(path, { headers: { Accept: "text/markdown" } });
  return r.text();
}

export function WebMcp() {
  useEffect(() => {
    const mc = (navigator as unknown as { modelContext?: ModelContext }).modelContext;
    if (!mc?.registerTool) return;
    const tools: ToolDef[] = [
      { name: "imobi_get_overview", description: "Resumo do Imobi Studio: o que é, para quem é e funcionalidades.", inputSchema: { type: "object", properties: {} }, execute: async () => text(await md("/")) },
      { name: "imobi_get_pricing", description: "Pacotes de créditos (Pix) e custo de cada vídeo por modelo de IA.", inputSchema: { type: "object", properties: {} }, execute: async () => text(await md("/precos")) },
      { name: "imobi_get_contact", description: "Canais de contato do Imobi Studio.", inputSchema: { type: "object", properties: {} }, execute: async () => text(await md("/contato")) },
      {
        name: "imobi_start_signup",
        description: "Abre o cadastro para criar uma conta grátis no Imobi Studio.",
        inputSchema: { type: "object", properties: { account_type: { type: "string", enum: ["imobiliaria", "corretor", "editor"], description: "Tipo de conta (opcional)" } } },
        execute: async () => {
          window.location.assign("/cadastro");
          return text("Abrindo a página de cadastro.");
        },
      },
    ];
    tools.forEach((t) => {
      try {
        mc.registerTool!(t);
      } catch {}
    });
    return () => tools.forEach((t) => { try { mc.unregisterTool?.(t.name); } catch {} });
  }, []);
  return null;
}
