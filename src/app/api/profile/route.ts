import { z } from "zod";
import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

const schema = z.object({
  full_name: z.string().min(2).max(120).optional(),
  account_type: z.enum(["imobiliaria", "corretor", "editor"]).optional(),
  company_name: z.string().max(120).nullable().optional(),
  creci: z.string().max(40).nullable().optional(),
  whatsapp: z.string().max(40).nullable().optional(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logo_url: z.string().max(1000).nullable().optional(),
});

export const PATCH = authed(async (req, userId) => {
  const patch = schema.parse(await req.json());
  const profile = await store.updateProfile(userId, patch);
  return json({ profile });
});
