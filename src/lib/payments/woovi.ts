import "server-only";
// Woovi (OpenPix): cobrança Pix por API.
// Docs: https://developers.woovi.com/docs/flows/flow-create-charge-api
import { env } from "../config";

const base = () => (env.wooviSandbox ? "https://api.woovi-sandbox.com" : "https://api.woovi.com");

type WooviCharge = {
  correlationID: string;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
  value: number;
  brCode?: string;
  qrCodeImage?: string;
  paymentLinkUrl?: string;
  expiresDate?: string;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(base() + path, {
    ...init,
    headers: { Authorization: env.wooviAppId, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Woovi ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export async function wooviCreateCharge(opts: { correlationID: string; valueCents: number; comment: string }) {
  const { charge } = await call<{ charge: WooviCharge }>("/api/v1/charge", {
    method: "POST",
    body: JSON.stringify({
      correlationID: opts.correlationID,
      value: opts.valueCents,
      comment: opts.comment,
      expiresIn: 3600,
    }),
  });
  return {
    providerRef: charge.correlationID,
    brCode: charge.brCode ?? null,
    qrCodeImage: charge.qrCodeImage ?? null,
    paymentLink: charge.paymentLinkUrl ?? null,
    expiresAt: charge.expiresDate ?? new Date(Date.now() + 3600_000).toISOString(),
  };
}

/** Consulta a cobrança direto na Woovi (fonte da verdade, não confia no webhook). */
export async function wooviChargeStatus(correlationID: string): Promise<"paid" | "pending" | "expired"> {
  const { charge } = await call<{ charge: WooviCharge }>(`/api/v1/charge/${encodeURIComponent(correlationID)}`);
  if (charge.status === "COMPLETED") return "paid";
  if (charge.status === "EXPIRED") return "expired";
  return "pending";
}
