// Configuração central. Tudo que depende de variável de ambiente passa por aqui.
// Sem as chaves, o app roda em "modo demonstração" para você testar o fluxo
// completo sem gastar nada (login, créditos, Pix e geração são simulados).

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  falKey: process.env.FAL_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  // Pagamentos (Pix)
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "woovi") as "woovi" | "efi",
  wooviAppId: process.env.WOOVI_APP_ID ?? "",
  wooviSandbox: process.env.WOOVI_SANDBOX === "true",
  efiClientId: process.env.EFI_CLIENT_ID ?? "",
  efiClientSecret: process.env.EFI_CLIENT_SECRET ?? "",
  efiCertBase64: process.env.EFI_CERT_BASE64 ?? "",
  efiCertPassword: process.env.EFI_CERT_PASSWORD ?? "",
  efiPixKey: process.env.EFI_PIX_KEY ?? "",
  efiSandbox: process.env.EFI_SANDBOX === "true",
  webhookSecret: process.env.WEBHOOK_SECRET ?? "dev-secret",

  // Economia de créditos
  usdToBrl: Number(process.env.USD_TO_BRL ?? "5.6"),
  markup: Number(process.env.CREDIT_MARKUP ?? "1.5"),
  creditValueBrl: Number(process.env.CREDIT_VALUE_BRL ?? "1"),
};

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceKey,
);
export const isFalConfigured = Boolean(env.falKey);
export const isWooviConfigured = Boolean(env.wooviAppId);
export const isEfiConfigured = Boolean(
  env.efiClientId && env.efiClientSecret && env.efiCertBase64 && env.efiPixKey,
);
export const isPaymentConfigured = isWooviConfigured || isEfiConfigured;

/** Modo demonstração: sem Supabase o app guarda tudo localmente. */
export const isDemo = !isSupabaseConfigured;

/** Créditos de boas-vindas (teste grátis) dados no cadastro. */
export const SIGNUP_BONUS_CREDITS = 9;
