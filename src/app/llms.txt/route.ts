import { FEATURES, PUBLIC_PAGES, site } from "@/lib/site";

// llms.txt (llmstxt.org): resumo do site para modelos de linguagem
export function GET() {
  const md = (p: string) => `${site.url}/md${p === "/" ? "" : p}`;
  const body = `# ${site.name}

> ${site.tagline}

${site.description}

Principais recursos:
${FEATURES.map((f) => `- ${f.name}: ${f.text}`).join("\n")}

Toda página pública também está disponível em Markdown: envie \`Accept: text/markdown\` ou use os links abaixo.

## Páginas
${PUBLIC_PAGES.map((p) => `- [${p.title}](${md(p.path)}): ${site.url}${p.path === "/" ? "" : p.path}`).join("\n")}

## Para agentes
- [Servidor MCP](${site.url}/api/mcp): ferramentas somente leitura (visão geral, preços, perguntas frequentes, contato). Cartão: ${site.url}/.well-known/mcp/server-card.json
- [Criar conta grátis](${site.url}/cadastro)

## Opcional
- [Sitemap](${site.url}/sitemap.xml)
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
