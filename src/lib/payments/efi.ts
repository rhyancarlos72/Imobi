import "server-only";
// Efí Bank (Pix API). Exige certificado .p12 (mTLS).
// Docs: https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas
import https from "https";
import { env } from "../config";

const host = () => (env.efiSandbox ? "pix-h.api.efipay.com.br" : "pix.api.efipay.com.br");

let agent: https.Agent | null = null;
function getAgent() {
  if (!agent) {
    agent = new https.Agent({
      pfx: Buffer.from(env.efiCertBase64, "base64"),
      passphrase: env.efiCertPassword || "",
      keepAlive: true,
    });
  }
  return agent;
}

function request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        host: host(),
        path,
        method,
        agent: getAgent(),
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data).toString() } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          if ((res.statusCode ?? 500) >= 400) return reject(new Error(`Efí ${res.statusCode}: ${raw.slice(0, 300)}`));
          try {
            resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

let token: { value: string; exp: number } | null = null;
async function accessToken() {
  if (token && token.exp > Date.now() + 30_000) return token.value;
  const basic = Buffer.from(`${env.efiClientId}:${env.efiClientSecret}`).toString("base64");
  const r = await request<{ access_token: string; expires_in: number }>(
    "POST",
    "/oauth/token",
    { grant_type: "client_credentials" },
    { Authorization: `Basic ${basic}` },
  );
  token = { value: r.access_token, exp: Date.now() + r.expires_in * 1000 };
  return token.value;
}

async function authed<T>(method: string, path: string, body?: unknown) {
  return request<T>(method, path, body, { Authorization: `Bearer ${await accessToken()}` });
}

export async function efiCreateCharge(opts: { valueCents: number; description: string }) {
  const cob = await authed<{ txid: string; loc: { id: number }; pixCopiaECola?: string; calendario: { criacao: string; expiracao: number } }>(
    "POST",
    "/v2/cob",
    {
      calendario: { expiracao: 3600 },
      valor: { original: (opts.valueCents / 100).toFixed(2) },
      chave: env.efiPixKey,
      solicitacaoPagador: opts.description.slice(0, 140),
    },
  );
  const qr = await authed<{ qrcode: string; imagemQrcode: string; linkVisualizacao?: string }>("GET", `/v2/loc/${cob.loc.id}/qrcode`);
  return {
    providerRef: cob.txid,
    brCode: qr.qrcode ?? cob.pixCopiaECola ?? null,
    qrCodeImage: qr.imagemQrcode ?? null,
    paymentLink: qr.linkVisualizacao ?? null,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}

export async function efiChargeStatus(txid: string): Promise<"paid" | "pending" | "expired"> {
  const cob = await authed<{ status: string }>("GET", `/v2/cob/${encodeURIComponent(txid)}`);
  if (cob.status === "CONCLUIDA") return "paid";
  if (cob.status.startsWith("REMOVIDA")) return "expired";
  return "pending";
}

/** Registra a URL de webhook na Efí (rodar uma vez: POST /api/webhooks/efi/setup). */
export async function efiRegisterWebhook(url: string) {
  return request<unknown>(
    "PUT",
    `/v2/webhook/${encodeURIComponent(env.efiPixKey)}`,
    { webhookUrl: url },
    { Authorization: `Bearer ${await accessToken()}`, "x-skip-mtls-checking": "true" },
  );
}
