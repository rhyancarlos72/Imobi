-- Bônus de cadastro: 9 créditos (1 vídeo de teste no Seedance Fast).
-- Só precisa rodar se você já tinha aplicado a 0001 antes desta mudança.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bonus integer := 9; -- créditos de boas-vindas (mesmo valor de SIGNUP_BONUS_CREDITS)
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

