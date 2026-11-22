import "server-only";
import { supabaseAdmin } from "../supabase/clients";
import { env } from "../config";
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
