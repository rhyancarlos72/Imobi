import "server-only";
import { supabaseAdmin } from "../supabase/clients";
import { env } from "../config";
import {
  InsufficientCreditsError,
  type AdminStats,
  type AdminUser,
  type CreditTransaction,
  type EditorProject,
  type Generation,
  type MediaFile,
  type Payment,
  type Profile,
  type Store,
} from "./types";

const BUCKET = "media";

function fail(error: { message: string } | null, where: string): never {
  throw new Error(`[supabase:${where}] ${error?.message ?? "erro desconhecido"}`);
}

function safeName(filename: string) {
  const dot = filename.lastIndexOf(".");
  const ext = dot > -1 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext || "bin"}`;
}

export const supabaseStore: Store = {
  async getProfile(userId) {
    const { data, error } = await supabaseAdmin().from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) fail(error, "getProfile");
    return (data as unknown as Profile | null) ?? null;
  },
  async updateProfile(userId, patch) {
    const { data, error } = await supabaseAdmin().from("profiles").update(patch as never).eq("id", userId).select("*").single();
    if (error) fail(error, "updateProfile");
    return data as Profile;
  },
  async spendCredits(userId, amount, description, ref) {
    const { data, error } = await supabaseAdmin().rpc("spend_credits" as never, {
      p_user: userId,
      p_amount: amount,
      p_description: description,
      p_ref: ref,
    } as never);
    if (error) {
      if (error.message.includes("INSUFFICIENT_CREDITS")) throw new InsufficientCreditsError();
      fail(error, "spendCredits");
    }
    return data as unknown as number;
  },
  async addCredits(userId, amount, kind, description, ref) {
    const { data, error } = await supabaseAdmin().rpc("add_credits" as never, {
      p_user: userId,
      p_amount: amount,
      p_kind: kind,
      p_description: description,
      p_ref: ref,
    } as never);
    if (error) fail(error, "addCredits");
    return data as unknown as number;
  },
  async listTransactions(userId) {
    const { data, error } = await supabaseAdmin()
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) fail(error, "listTransactions");
    return (data ?? []) as CreditTransaction[];
  },

  async createGeneration(row) {
    const { data, error } = await supabaseAdmin().from("generations").insert(row as never).select("*").single();
    if (error) fail(error, "createGeneration");
    return data as Generation;
  },
  async updateGeneration(id, patch) {
    const { error } = await supabaseAdmin().from("generations").update(patch as never).eq("id", id);
    if (error) fail(error, "updateGeneration");
  },
  async transitionGeneration(id, from, patch) {
    const { data, error } = await supabaseAdmin()
      .from("generations")
      .update(patch as never)
      .eq("id", id)
      .in("status", from)
      .select("id");
    if (error) fail(error, "transitionGeneration");
    return (data ?? []).length > 0;
  },
  async getGeneration(id) {
    const { data, error } = await supabaseAdmin().from("generations").select("*").eq("id", id).maybeSingle();
    if (error) fail(error, "getGeneration");
    return (data as unknown as Generation | null) ?? null;
  },
  async listGenerations(userId, limit = 100) {
    const { data, error } = await supabaseAdmin()
      .from("generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) fail(error, "listGenerations");
    return (data ?? []) as Generation[];
  },

  async createPayment(row) {
    const { data, error } = await supabaseAdmin().from("payments").insert(row as never).select("*").single();
    if (error) fail(error, "createPayment");
    return data as Payment;
  },
  async updatePayment(id, patch) {
    const { error } = await supabaseAdmin().from("payments").update(patch as never).eq("id", id);
    if (error) fail(error, "updatePayment");
  },
  async getPayment(id) {
    const { data, error } = await supabaseAdmin().from("payments").select("*").eq("id", id).maybeSingle();
    if (error) fail(error, "getPayment");
    return (data as unknown as Payment | null) ?? null;
  },
  async findPaymentByRef(provider, ref) {
    const { data, error } = await supabaseAdmin()
      .from("payments")
      .select("*")
      .eq("provider", provider)
      .eq("provider_ref", ref)
      .maybeSingle();
    if (error) fail(error, "findPaymentByRef");
    return (data as unknown as Payment | null) ?? null;
  },
  async markPaymentPaid(id) {
    const { data, error } = await supabaseAdmin().rpc("mark_payment_paid" as never, { p_payment: id } as never);
    if (error) fail(error, "markPaymentPaid");
    return Boolean(data);
  },

  async listMedia(userId) {
    const { data, error } = await supabaseAdmin()
      .from("media_files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) fail(error, "listMedia");
    return (data ?? []) as MediaFile[];
  },
  async addMedia(row) {
    const { data, error } = await supabaseAdmin().from("media_files").insert(row as never).select("*").single();
    if (error) fail(error, "addMedia");
    return data as MediaFile;
  },

  async listProjects(userId) {
    const { data, error } = await supabaseAdmin()
      .from("editor_projects")
      .select("id,user_id,name,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) fail(error, "listProjects");
    return (data ?? []).map((p) => ({ ...(p as object), timeline: null })) as EditorProject[];
  },
  async getProject(userId, id) {
    const { data, error } = await supabaseAdmin()
      .from("editor_projects")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error, "getProject");
    return (data as unknown as EditorProject | null) ?? null;
  },
  async saveProject(userId, p) {
    const now = new Date().toISOString();
    if (p.id) {
      const { data, error } = await supabaseAdmin()
        .from("editor_projects")
        .update({ name: p.name, timeline: p.timeline, updated_at: now } as never)
        .eq("id", p.id)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();
      if (error) fail(error, "saveProject");
      if (data) return data as EditorProject;
    }
    const { data, error } = await supabaseAdmin()
      .from("editor_projects")
      .insert({ user_id: userId, name: p.name, timeline: p.timeline } as never)
      .select("*")
      .single();
    if (error) fail(error, "saveProject");
    return data as EditorProject;
  },

  // ------------------------------------------------------------ admin
  async adminStats() {
    const db = supabaseAdmin();
    const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
    const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
    const [profiles, paid, pending, gens] = await Promise.all([
      db.from("profiles").select("credits,created_at").limit(100000),
      db.from("payments").select("amount_cents,credits,paid_at").eq("status", "paid").limit(100000),
      db.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("generations").select("status,credits_cost,created_at").limit(100000),
    ]);
    for (const r of [profiles, paid, gens]) if (r.error) fail(r.error, "adminStats");
    const P = (profiles.data ?? []) as { credits: number; created_at: string }[];
    const Y = (paid.data ?? []) as { amount_cents: number; credits: number; paid_at: string | null }[];
    const G = (gens.data ?? []) as { status: string; credits_cost: number; created_at: string }[];
    const stats: AdminStats = {
      users: P.length,
      usersLast7d: P.filter((p) => p.created_at >= since7).length,
      revenueCents: Y.reduce((a, p) => a + p.amount_cents, 0),
      revenueLast30dCents: Y.filter((p) => (p.paid_at ?? "") >= since30).reduce((a, p) => a + p.amount_cents, 0),
      paidPayments: Y.length,
      pendingPayments: pending.count ?? 0,
      creditsSold: Y.reduce((a, p) => a + p.credits, 0),
      creditsBalance: P.reduce((a, p) => a + p.credits, 0),
      generations: G.length,
      generationsFailed: G.filter((g) => g.status === "failed").length,
      generationsLast7d: G.filter((g) => g.created_at >= since7).length,
      creditsSpent: G.filter((g) => g.status === "completed").reduce((a, g) => a + g.credits_cost, 0),
    };
    return stats;
  },
  async adminListUsers() {
    const db = supabaseAdmin();
    const authUsers: { id: string; email?: string; last_sign_in_at?: string | null; banned_until?: string | null }[] = [];
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) fail(error, "listUsers");
      authUsers.push(...(data.users as typeof authUsers));
      if (data.users.length < 1000) break;
    }
    const [profiles, paid, gens] = await Promise.all([
      db.from("profiles").select("*").order("created_at", { ascending: false }).limit(100000),
      db.from("payments").select("user_id,amount_cents").eq("status", "paid").limit(100000),
      db.from("generations").select("user_id").limit(100000),
    ]);
    for (const r of [profiles, paid, gens]) if (r.error) fail(r.error, "adminListUsers");
    const byId = new Map(authUsers.map((u) => [u.id, u]));
    const paidBy = new Map<string, number>();
    for (const p of (paid.data ?? []) as { user_id: string; amount_cents: number }[]) paidBy.set(p.user_id, (paidBy.get(p.user_id) ?? 0) + p.amount_cents);
    const gensBy = new Map<string, number>();
    for (const g of (gens.data ?? []) as { user_id: string }[]) gensBy.set(g.user_id, (gensBy.get(g.user_id) ?? 0) + 1);
    return ((profiles.data ?? []) as Profile[]).map((p) => {
      const u = byId.get(p.id);
      return {
        ...p,
        email: u?.email ?? null,
        last_sign_in_at: u?.last_sign_in_at ?? null,
        banned: Boolean(u?.banned_until && new Date(u.banned_until) > new Date()),
        paid_cents: paidBy.get(p.id) ?? 0,
        generations: gensBy.get(p.id) ?? 0,
      } satisfies AdminUser;
    });
  },
  async adminListPayments(limit = 300) {
    const { data, error } = await supabaseAdmin().from("payments").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) fail(error, "adminListPayments");
    return (data ?? []) as Payment[];
  },
  async adminListGenerations(limit = 300) {
    const { data, error } = await supabaseAdmin().from("generations").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) fail(error, "adminListGenerations");
    return (data ?? []) as Generation[];
  },
  async adminAdjustCredits(userId, delta, reason) {
    if (delta > 0) return this.addCredits(userId, delta, "adjustment", reason, null);
    const db = supabaseAdmin();
    const { data: prof, error } = await db.from("profiles").select("credits").eq("id", userId).single();
    if (error) fail(error, "adminAdjustCredits");
    const current = (prof as { credits: number }).credits;
    const take = Math.min(current, -delta);
    if (take <= 0) return current;
    const { error: e2 } = await db.from("profiles").update({ credits: current - take } as never).eq("id", userId).eq("credits", current);
    if (e2) fail(e2, "adminAdjustCredits");
    await db.from("credit_transactions").insert({ user_id: userId, amount: -take, kind: "adjustment", description: reason, ref_id: null } as never);
    return current - take;
  },
  async adminSetBanned(userId, banned) {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { ban_duration: banned ? "876000h" : "none" });
    if (error) fail(error, "adminSetBanned");
  },

  async createUpload(userId, filename) {
    const path = `${userId}/${safeName(filename)}`;
    const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) fail(error, "createUpload");
    const publicUrl = supabaseAdmin().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    return { mode: "supabase", path, token: data.token, publicUrl };
  },
  async putObject(userId, filename, bytes, contentType) {
    const path = `${userId}/${safeName(filename)}`;
    const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
    if (error) fail(error, "putObject");
    return supabaseAdmin().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  },
};

// evita warning de import não usado em alguns bundlers
void env;
