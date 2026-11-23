export type AccountType = "imobiliaria" | "corretor" | "editor";

export type Profile = {
  id: string;
  full_name: string | null;
  account_type: AccountType;
  company_name: string | null;
  creci: string | null;
  whatsapp: string | null;
  brand_color: string;
  logo_url: string | null;
  credits: number;
  created_at: string;
};

export type ProfilePatch = Partial<
  Pick<Profile, "full_name" | "account_type" | "company_name" | "creci" | "whatsapp" | "brand_color" | "logo_url">
>;

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export type Generation = {
  id: string;
  user_id: string;
  kind: "video" | "staging";
  mode: string | null;
  model_id: string;
  endpoint: string;
  prompt: string | null;
  params: Record<string, unknown>;
  input: Record<string, unknown>;
  status: GenerationStatus;
  fal_request_id: string | null;
  output_url: string | null;
  thumbnail_url: string | null;
  credits_cost: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type NewGeneration = Omit<
  Generation,
  "id" | "created_at" | "completed_at" | "status" | "fal_request_id" | "output_url" | "error"
> & { status?: GenerationStatus };

export type PaymentStatus = "pending" | "paid" | "expired" | "failed";

export type Payment = {
  id: string;
  user_id: string;
  provider: "woovi" | "efi" | "demo";
  provider_ref: string | null;
  package_id: string;
  credits: number;
  amount_cents: number;
  status: PaymentStatus;
  br_code: string | null;
  qr_code_image: string | null;
  payment_link: string | null;
  expires_at: string | null;
  created_at: string;
  paid_at: string | null;
};

export type CreditTransaction = {
  id: number | string;
  user_id: string;
  amount: number;
  kind: "purchase" | "generation" | "refund" | "bonus" | "adjustment";
  description: string | null;
  ref_id: string | null;
  created_at: string;
};

export type MediaFile = {
  id: string;
  user_id: string;
  kind: "image" | "video" | "audio";
  name: string;
  url: string;
  created_at: string;
};

export type EditorProject = {
  id: string;
  user_id: string;
  name: string;
  timeline: unknown;
  created_at: string;
  updated_at: string;
};

export type AdminUser = Profile & {
  email: string | null;
  last_sign_in_at: string | null;
  banned: boolean;
  paid_cents: number;
  generations: number;
};

export type AdminStats = {
  users: number;
  usersLast7d: number;
  revenueCents: number;
  revenueLast30dCents: number;
  paidPayments: number;
  pendingPayments: number;
  creditsSold: number;
  creditsBalance: number;
  generations: number;
  generationsFailed: number;
  generationsLast7d: number;
  creditsSpent: number;
};

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
  }
}

export type UploadTicket =
  | { mode: "supabase"; path: string; token: string; publicUrl: string }
  | { mode: "demo"; uploadUrl: string; publicUrl: string };

export interface Store {
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<Profile>;
  spendCredits(userId: string, amount: number, description: string, ref: string): Promise<number>;
  addCredits(userId: string, amount: number, kind: CreditTransaction["kind"], description: string, ref: string | null): Promise<number>;
  listTransactions(userId: string): Promise<CreditTransaction[]>;

  createGeneration(row: NewGeneration): Promise<Generation>;
  updateGeneration(id: string, patch: Partial<Generation>): Promise<void>;
  /** Atualiza só se o status atual estiver em `from`. Retorna true se mudou (evita reembolso duplo). */
  transitionGeneration(id: string, from: GenerationStatus[], patch: Partial<Generation>): Promise<boolean>;
  getGeneration(id: string): Promise<Generation | null>;
  listGenerations(userId: string, limit?: number): Promise<Generation[]>;

  createPayment(row: Omit<Payment, "id" | "created_at" | "paid_at" | "status">): Promise<Payment>;
  updatePayment(id: string, patch: Partial<Payment>): Promise<void>;
  getPayment(id: string): Promise<Payment | null>;
  findPaymentByRef(provider: Payment["provider"], ref: string): Promise<Payment | null>;
  /** Marca como pago e credita uma única vez. Retorna true se creditou agora. */
  markPaymentPaid(id: string): Promise<boolean>;

  listMedia(userId: string): Promise<MediaFile[]>;
  addMedia(row: Omit<MediaFile, "id" | "created_at">): Promise<MediaFile>;

  listProjects(userId: string): Promise<EditorProject[]>;
  getProject(userId: string, id: string): Promise<EditorProject | null>;
  saveProject(userId: string, p: { id?: string; name: string; timeline: unknown }): Promise<EditorProject>;

  /** Gera um "ticket" para o navegador enviar um arquivo direto ao storage. */
  createUpload(userId: string, filename: string, contentType: string): Promise<UploadTicket>;
  // ---- painel admin
  adminStats(): Promise<AdminStats>;
  adminListUsers(): Promise<AdminUser[]>;
  adminListPayments(limit?: number): Promise<Payment[]>;
  adminListGenerations(limit?: number): Promise<Generation[]>;
  /** Soma (ou subtrai) créditos registrando o motivo. Nunca deixa o saldo negativo. */
  adminAdjustCredits(userId: string, delta: number, reason: string): Promise<number>;
  adminSetBanned(userId: string, banned: boolean): Promise<void>;

  /** Salva bytes no storage (usado pelo servidor ao copiar vídeos gerados). */
  putObject(userId: string, filename: string, data: ArrayBuffer, contentType: string): Promise<string>;
}
