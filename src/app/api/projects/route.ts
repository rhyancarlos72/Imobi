import { z } from "zod";
import { authed, json } from "@/lib/http";
import { store } from "@/lib/store";

export const GET = authed(async (_req, userId) => json({ projects: await store.listProjects(userId) }));

const schema = z.object({ id: z.string().optional(), name: z.string().min(1).max(120), timeline: z.unknown() });
export const POST = authed(async (req, userId) => {
  const body = schema.parse(await req.json());
  const project = await store.saveProject(userId, { id: body.id, name: body.name, timeline: body.timeline });
  return json({ project: { ...project, timeline: undefined } });
});
