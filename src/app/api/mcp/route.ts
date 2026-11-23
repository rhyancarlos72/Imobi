import { handleRpc } from "@/lib/mcp";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id" };

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, { status: 400, headers: CORS });
  }
  const msgs = Array.isArray(body) ? body : [body];
  const out = msgs.map((m) => handleRpc(m as Parameters<typeof handleRpc>[0])).filter((r) => r !== null);
  if (!out.length) return new Response(null, { status: 202, headers: CORS });
  return Response.json(Array.isArray(body) ? out : out[0], { headers: CORS });
}

// Sem fluxo SSE iniciado pelo servidor
export function GET() {
  return new Response("Use POST (MCP Streamable HTTP).", { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
