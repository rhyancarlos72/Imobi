import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export const GET = authed<Ctx>(async (_req, userId, { params }) => {
  const project = await store.getProject(userId, (await params).id);
  if (!project) return json({ error: "Projeto não encontrado" }, 404);
  return json({ project });
});
