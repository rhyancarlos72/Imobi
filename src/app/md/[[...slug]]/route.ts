import { pageMarkdown } from "@/lib/content";

type Ctx = { params: Promise<{ slug?: string[] }> };

// Versão Markdown das páginas públicas (também servida em "/" quando Accept: text/markdown)
export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const path = "/" + (slug ?? []).join("/");
  const page = pageMarkdown(path === "/home" ? "/" : path);
  if (!page) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  return new Response(page.md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept", "Cache-Control": "public, max-age=600" },
  });
}
