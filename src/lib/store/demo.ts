import "server-only";
// Armazenamento local para o MODO DEMONSTRAÇÃO (sem Supabase configurado).
// Guarda tudo em .demo/db.json e os arquivos em .demo/media/. Não use em produção.
import { promises as fs } from "fs";
import path from "path";
import {
  InsufficientCreditsError,
  type CreditTransaction,
  type EditorProject,
  type Generation,
  type MediaFile,
  type Payment,
  type Profile,
  type Store,
} from "./types";

export const DEMO_DIR = path.join(process.cwd(), ".demo");
export const DEMO_MEDIA_DIR = path.join(DEMO_DIR, "media");
const DB_FILE = path.join(DEMO_DIR, "db.json");

type DB = {
  profiles: Profile[];
  transactions: CreditTransaction[];
  generations: Generation[];
  payments: Payment[];
  media: MediaFile[];
  projects: EditorProject[];
};

let cache: DB | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<DB> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as DB;
  } catch {
    cache = { profiles: [], transactions: [], generations: [], payments: [], media: [], projects: [] };
  }
  return cache;
}

async function save() {
  await fs.mkdir(DEMO_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2));
}

/** Serializa operações para não corromper o arquivo. */
function tx<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save();
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function safeName(filename: string) {
  const dot = filename.lastIndexOf(".");
  const ext = dot > -1 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  return `${Date.now()}-${uid().slice(0, 8)}.${ext || "bin"}`;
}

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

export const demoStore: Store = {
  getProfile: (userId) => tx((db) => db.profiles.find((p) => p.id === userId) ?? null),
  updateProfile: (userId, patch) =>
    tx((db) => {
      let p = db.profiles.find((x) => x.id === userId);
      if (!p) {
        p = {
          id: userId,
          full_name: null,
          account_type: "corretor",
          company_name: null,
          creci: null,
          whatsapp: null,
          brand_color: "#C6F432",
          logo_url: null,
          credits: 0,
          created_at: now(),
        };
        db.profiles.push(p);
      }
      Object.assign(p, patch);
      return p;
    }),
  spendCredits: (userId, amount, description, ref) =>
    tx((db) => {
      const p = db.profiles.find((x) => x.id === userId);
      if (!p || p.credits < amount) throw new InsufficientCreditsError();
      p.credits -= amount;
      db.transactions.push({ id: uid(), user_id: userId, amount: -amount, kind: "generation", description, ref_id: ref, created_at: now() });
      return p.credits;
    }),
  addCredits: (userId, amount, kind, description, ref) =>
    tx((db) => {
      const p = db.profiles.find((x) => x.id === userId);
      if (!p) throw new Error("perfil não encontrado");
      p.credits += amount;
      db.transactions.push({ id: uid(), user_id: userId, amount, kind, description, ref_id: ref, created_at: now() });
      return p.credits;
    }),
  listTransactions: (userId) =>
    tx((db) => db.transactions.filter((t) => t.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50)),

  createGeneration: (row) =>
    tx((db) => {
      const g: Generation = {
        status: "queued",
        fal_request_id: null,
        output_url: null,
        error: null,
        completed_at: null,
        ...row,
        id: uid(),
        created_at: now(),
      };
      db.generations.push(g);
      return g;
    }),
  updateGeneration: (id, patch) =>
    tx((db) => {
      const g = db.generations.find((x) => x.id === id);
      if (g) Object.assign(g, patch);
    }),
  transitionGeneration: (id, from, patch) =>
    tx((db) => {
      const g = db.generations.find((x) => x.id === id);
      if (!g || !from.includes(g.status)) return false;
      Object.assign(g, patch);
      return true;
    }),
  getGeneration: (id) => tx((db) => db.generations.find((x) => x.id === id) ?? null),
  listGenerations: (userId, limit = 100) =>
    tx((db) =>
      db.generations
        .filter((g) => g.user_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit),
    ),

  createPayment: (row) =>
    tx((db) => {
      const p: Payment = { ...row, id: uid(), status: "pending", created_at: now(), paid_at: null };
      db.payments.push(p);
      return p;
    }),
  updatePayment: (id, patch) =>
    tx((db) => {
      const p = db.payments.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    }),
  getPayment: (id) => tx((db) => db.payments.find((x) => x.id === id) ?? null),
  findPaymentByRef: (provider, ref) => tx((db) => db.payments.find((x) => x.provider === provider && x.provider_ref === ref) ?? null),
  markPaymentPaid: (id) =>
    tx((db) => {
      const pay = db.payments.find((x) => x.id === id);
      if (!pay || pay.status !== "pending") return false;
      pay.status = "paid";
      pay.paid_at = now();
      const prof = db.profiles.find((x) => x.id === pay.user_id);
      if (prof) {
        prof.credits += pay.credits;
        db.transactions.push({
          id: uid(),
          user_id: pay.user_id,
          amount: pay.credits,
          kind: "purchase",
          description: `Compra de créditos (${pay.package_id})`,
          ref_id: pay.id,
          created_at: now(),
        });
      }
      return true;
    }),

  listMedia: (userId) =>
    tx((db) => db.media.filter((m) => m.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))),
  addMedia: (row) =>
    tx((db) => {
      const m: MediaFile = { ...row, id: uid(), created_at: now() };
      db.media.push(m);
      return m;
    }),

  listProjects: (userId) =>
    tx((db) =>
      db.projects
        .filter((p) => p.user_id === userId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((p) => ({ ...p, timeline: null })),
    ),
  getProject: (userId, id) => tx((db) => db.projects.find((p) => p.user_id === userId && p.id === id) ?? null),
  saveProject: (userId, p) =>
    tx((db) => {
      const existing = p.id ? db.projects.find((x) => x.id === p.id && x.user_id === userId) : undefined;
      if (existing) {
        existing.name = p.name;
        existing.timeline = p.timeline;
        existing.updated_at = now();
        return existing;
      }
      const created: EditorProject = { id: uid(), user_id: userId, name: p.name, timeline: p.timeline, created_at: now(), updated_at: now() };
      db.projects.push(created);
      return created;
    }),

  async createUpload(_userId, filename) {
    const name = safeName(filename);
    return { mode: "demo", uploadUrl: `/api/demo-media/${name}`, publicUrl: `/api/demo-media/${name}` };
  },
  async putObject(_userId, filename, bytes) {
    const name = safeName(filename);
    await fs.mkdir(DEMO_MEDIA_DIR, { recursive: true });
    await fs.writeFile(path.join(DEMO_MEDIA_DIR, name), Buffer.from(bytes));
    return `/api/demo-media/${name}`;
  },
};
