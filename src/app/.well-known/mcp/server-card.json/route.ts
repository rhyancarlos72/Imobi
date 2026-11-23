import { MCP_PROTOCOL_VERSION, MCP_SERVER, MCP_TOOLS } from "@/lib/mcp";
import { site } from "@/lib/site";

// MCP Server Card (SEP-1649)
export function GET() {
  return Response.json(
    {
      $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
      version: "1.0",
      protocolVersion: MCP_PROTOCOL_VERSION,
      serverInfo: { ...MCP_SERVER, websiteUrl: site.url, icons: [{ src: `${site.url}/logo.svg`, mimeType: "image/svg+xml" }] },
      name: MCP_SERVER.name,
      description: `Informações públicas do ${site.name}: visão geral, preços, perguntas frequentes e contato.`,
      endpoint: `${site.url}/api/mcp`,
      transport: { type: "streamable-http", url: `${site.url}/api/mcp` },
      authentication: { required: false },
      capabilities: { tools: { listChanged: false } },
      tools: MCP_TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema, annotations: { readOnlyHint: true } })),
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}
