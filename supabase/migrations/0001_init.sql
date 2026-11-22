-- Imobi Studio: schema inicial
-- Aplicar no SQL Editor do Supabase (ou via `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Perfis (um por usuário). O tipo de conta é escolhido no cadastro.
-- ---------------------------------------------------------------
do $$ begin
  create type public.account_type as enum ('imobiliaria', 'corretor', 'editor');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  account_type public.account_type not null default 'corretor',
  company_name text,
  creci text,
  whatsapp text,
  brand_color text not null default '#C6F432',
  logo_url text,
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now()
);

-- Histórico de créditos (compras, gastos, reembolsos, bônus)
create table if not exists public.credit_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  kind text not null check (kind in ('purchase', 'generation', 'refund', 'bonus', 'adjustment')),
  description text,
  ref_id text,
  created_at timestamptz not null default now()
);
create index if not exists credit_transactions_user_idx on public.credit_transactions (user_id, created_at desc);

-- Cobranças Pix (Woovi ou Efí)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('woovi', 'efi', 'demo')),
  provider_ref text,
  package_id text not null,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed')),
  br_code text,
  qr_code_image text,
  payment_link text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create unique index if not exists payments_provider_ref_idx on public.payments (provider, provider_ref);

-- Gerações de IA (vídeos e mobília virtual)
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('video', 'staging')),
  mode text,
  model_id text not null,
  endpoint text not null,
  prompt text,
  params jsonb not null default '{}'::jsonb,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  fal_request_id text,
  output_url text,
  thumbnail_url text,
  credits_cost integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists generations_user_idx on public.generations (user_id, created_at desc);

-- Projetos do editor (linha do tempo salva em JSON)
create table if not exists public.editor_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Projeto sem título',
  timeline jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists editor_projects_user_idx on public.editor_projects (user_id, updated_at desc);

-- Arquivos enviados pelo usuário (fotos, vídeos, músicas, logo)
create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'audio')),
  name text not null,
  url text not null,
  created_at timestamptz not null default now()
);
create index if not exists media_files_user_idx on public.media_files (user_id, created_at desc);

-- ---------------------------------------------------------------
-- RLS: cada usuário só enxerga o que é dele. Escritas sensíveis
-- (créditos, pagamentos, gerações) só acontecem no servidor com a
-- service role, por isso não há policy de insert/update nelas.
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.generations enable row level security;
alter table public.editor_projects enable row level security;
alter table public.media_files enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- O usuário pode editar o perfil, mas NUNCA a coluna credits.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, account_type, company_name, creci, whatsapp, brand_color, logo_url) on public.profiles to authenticated;

drop policy if exists "tx_select_own" on public.credit_transactions;
create policy "tx_select_own" on public.credit_transactions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own" on public.generations for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "projects_all_own" on public.editor_projects;
create policy "projects_all_own" on public.editor_projects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "media_all_own" on public.media_files;
create policy "media_all_own" on public.media_files for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------
-- Funções de crédito (atômicas). Só a service role pode chamar.
-- ---------------------------------------------------------------
create or replace function public.spend_credits(p_user uuid, p_amount integer, p_description text, p_ref text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_balance integer;
begin
  if p_amount <= 0 then raise exception 'invalid amount'; end if;
  update public.profiles set credits = credits - p_amount
   where id = p_user and credits >= p_amount
   returning credits into new_balance;
  if new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;
  insert into public.credit_transactions (user_id, amount, kind, description, ref_id)
  values (p_user, -p_amount, 'generation', p_description, p_ref);
  return new_balance;
end $$;

create or replace function public.add_credits(p_user uuid, p_amount integer, p_kind text, p_description text, p_ref text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_balance integer;
begin
  if p_amount <= 0 then raise exception 'invalid amount'; end if;
  update public.profiles set credits = credits + p_amount where id = p_user returning credits into new_balance;
  insert into public.credit_transactions (user_id, amount, kind, description, ref_id)
  values (p_user, p_amount, p_kind, p_description, p_ref);
  return new_balance;
end $$;

-- Marca o pagamento como pago e credita UMA única vez (idempotente).
create or replace function public.mark_payment_paid(p_payment uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare pay public.payments%rowtype;
begin
  update public.payments set status = 'paid', paid_at = now()
   where id = p_payment and status = 'pending'
   returning * into pay;
  if pay.id is null then return false; end if;
  perform public.add_credits(pay.user_id, pay.credits, 'purchase', 'Compra de créditos (' || pay.package_id || ')', pay.id::text);
  return true;
end $$;

revoke all on function public.spend_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.add_credits(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_payment_paid(uuid) from public, anon, authenticated;
grant execute on function public.spend_credits(uuid, integer, text, text) to service_role;
grant execute on function public.add_credits(uuid, integer, text, text, text) to service_role;
grant execute on function public.mark_payment_paid(uuid) to service_role;

-- ---------------------------------------------------------------
-- Cria o perfil automaticamente no cadastro (+ créditos de teste)
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bonus integer := 10; -- créditos de boas-vindas (mesmo valor de SIGNUP_BONUS_CREDITS)
  acc text := coalesce(new.raw_user_meta_data ->> 'account_type', 'corretor');
begin
  if acc not in ('imobiliaria', 'corretor', 'editor') then acc := 'corretor'; end if;
  insert into public.profiles (id, full_name, account_type, company_name, creci, whatsapp)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    acc::public.account_type,
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'creci',
    new.raw_user_meta_data ->> 'whatsapp'
  );
  if bonus > 0 then
    perform public.add_credits(new.id, bonus, 'bonus', 'Créditos de boas-vindas', null);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Storage: bucket público "media" (fotos, vídeos gerados, músicas).
-- Uploads são feitos com URL assinada gerada pelo servidor.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 524288000)
on conflict (id) do nothing;
