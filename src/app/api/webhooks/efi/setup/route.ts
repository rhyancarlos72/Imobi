// Rode uma vez (com o segredo) para cadastrar o webhook na Efí:
// curl -X POST "https://SEU-DOMINIO/api/webhooks/efi/setup?secret=WEBHOOK_SECRET"
import { env, isEfiConfigured } from "@/lib/config";
import { json } from "@/lib/http";
import { efiRegisterWebhook } from "@/lib/payments/efi";

export async function POST(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!isEfiConfigured || secret !== env.webhookSecret) return json({ error: "não autorizado" }, 401);
  const res = await efiRegisterWebhook(`${env.appUrl}/api/webhooks/efi?ignorar=`);
  return json({ ok: true, res });
}
