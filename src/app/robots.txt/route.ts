import { site } from "@/lib/site";

// robots.txt com política de rastreamento e Content Signals (contentsignals.org)
export function GET() {
  const body = `# ${site.name}
# Política de uso do conteúdo: busca e respostas de IA sim; treinamento de modelos não.
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /
Disallow: /studio/
Disallow: /admin
Disallow: /api/
Disallow: /auth/
Allow: /api/mcp

Sitemap: ${site.url}/sitemap.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
