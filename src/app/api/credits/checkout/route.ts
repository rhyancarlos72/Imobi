import { z } from "zod";
import { authed, json } from "@/lib/http";
import { createCreditCharge } from "@/lib/payments";

export const POST = authed(async (req, userId) => {
  const { packageId } = z.object({ packageId: z.string() }).parse(await req.json());
  const payment = await createCreditCharge(userId, packageId);
  return json({ payment });
});
