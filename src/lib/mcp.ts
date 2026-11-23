// Servidor MCP mínimo (JSON-RPC 2.0, transporte Streamable HTTP sem estado).
// Ferramentas somente leitura com informações públicas do Imobi Studio.
import { pageMarkdown } from "./content";
import { FAQ, pricingList, site } from "./site";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER = { name: "imobi-studio", title: "Imobi Studio", version: "1.0.0" };

type Tool = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; run: () => string };

export const MCP_TOOLS: Tool[] = [
  { name: "get_overview", title: "Visão geral", description: "O que é o Imobi Studio, para quem é e os recursos principais.", inputSchema: { type: "object", properties: {} }, run: () => pageMarkdown("/")!.md },
  { name: "get_pricing", title: "Preços", description: "Pacotes de créditos pagos via Pix e custo de cada vídeo por modelo de IA.", inputSchema: { type: "object", properties: {} }, run: () => pageMarkdown("/precos")!.md + "\n\n```json\n" + JSON.stringify(pricingList(), null, 2) + "\n```" },
  { name: "get_faq", title: "Perguntas frequentes", description: "Perguntas e respostas sobre uso, cobrança, prazo e mobília virtual.", inputSchema: { type: "object", properties: {} }, run: () => FAQ.map((f) => `### ${f.q}\n${f.a}`).join("\n\n") },
  { name: "get_contact", title: "Contato", description: "Canais oficiais de contato e links do site.", inputSchema: { type: "object", properties: {} }, run: () => pageMarkdown("/contato")!.md },
];

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: { name?: string } & Record<string, unknown> };

export function handleRpc(msg: RpcRequest): unknown | null {
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id ?? null, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });
  if (msg.id === undefined) return null; // notificação: sem resposta
  switch (msg.method) {
    case "initialize":
      return ok({
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: MCP_SERVER,
        instructions: `Ferramentas somente leitura sobre o ${site.name}. Para usar o produto, crie uma conta em ${site.url}/cadastro.`,
      });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: MCP_TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema, annotations: { readOnlyHint: true, openWorldHint: false } })) });
    case "tools/call": {
      const tool = MCP_TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return err(-32602, `Ferramenta desconhecida: ${msg.params?.name}`);
      return ok({ content: [{ type: "text", text: tool.run() }], isError: false });
    }
    default:
      return err(-32601, `Método não suportado: ${msg.method}`);
  }
}
