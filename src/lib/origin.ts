// Endereço público do site. Atrás de proxy (Nginx na VPS) o Next.js pode
// enxergar o host interno (0.0.0.0:3000), então nunca usamos req.url para redirecionar.
export function publicOrigin(headers: Headers): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !/localhost|0\.0\.0\.0|127\.0\.0\.1/.test(configured)) return configured.replace(/\/$/, "");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (host && !host.startsWith("0.0.0.0")) {
    const proto = headers.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}
