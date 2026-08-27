-- =====================================================
-- IBNF - CADASTRO POR CONVITE + APROVAÇÃO + PERMISSÕES
-- Execute uma vez no SQL Editor do Supabase
-- =====================================================

-- 1) Campos adicionais no perfil
alter table public.perfis add column if not exists telefone text;
alter table public.perfis add column if not exists permissoes jsonb not null default '{}'::jsonb;
alter table public.perfis add column if not exists aprovado_em timestamptz;
alter table public.perfis add column if not exists aprovado_por uuid;
alter table public.perfis add column if not exists criado_em timestamptz not null default now();

-- 2) Todo novo usuário entra como membro PENDENTE (ativo=false)
create or replace function public.ibnf_criar_perfil_pendente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, telefone, perfil, ativo, permissoes)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    nullif(new.raw_user_meta_data->>'telefone',''),
    'membro',
    false,
    '{}'::jsonb
  )
  on conflict (id) do update set
    nome = coalesce(excluded.nome, public.perfis.nome),
    telefone = coalesce(excluded.telefone, public.perfis.telefone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ibnf_profile on auth.users;
create trigger on_auth_user_created_ibnf_profile
after insert on auth.users
for each row execute procedure public.ibnf_criar_perfil_pendente();

-- 3) RLS
alter table public.perfis enable row level security;

drop policy if exists "usuario ve proprio perfil" on public.perfis;
create policy "usuario ve proprio perfil"
on public.perfis for select
to authenticated
using (id = auth.uid());

drop policy if exists "pastor lista perfis" on public.perfis;
create policy "pastor lista perfis"
on public.perfis for select
to authenticated
using (
  exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and p.perfil in ('pastor','admin')
  )
);

drop policy if exists "pastor atualiza perfis" on public.perfis;
create policy "pastor atualiza perfis"
on public.perfis for update
to authenticated
using (
  exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and p.perfil in ('pastor','admin')
  )
)
with check (
  exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and p.perfil in ('pastor','admin')
  )
);

-- 4) Aprovar e definir perfil/permissões
create or replace function public.ibnf_aprovar_usuario(
  alvo uuid,
  novo_perfil text,
  novas_permissoes jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and p.perfil in ('pastor','admin')
  ) then
    raise exception 'Sem permissão para aprovar usuários';
  end if;

  if novo_perfil not in ('membro','lider','secretaria','tesouraria','pastor','admin') then
    raise exception 'Perfil inválido';
  end if;

  update public.perfis
     set ativo = true,
         perfil = novo_perfil,
         permissoes = coalesce(novas_permissoes,'{}'::jsonb),
         aprovado_em = now(),
         aprovado_por = auth.uid()
   where id = alvo;
end;
$$;

grant execute on function public.ibnf_aprovar_usuario(uuid,text,jsonb) to authenticated;

-- 5) Suspender acesso
create or replace function public.ibnf_suspender_usuario(alvo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and p.perfil in ('pastor','admin')
  ) then
    raise exception 'Sem permissão para suspender usuários';
  end if;

  if alvo = auth.uid() then
    raise exception 'Você não pode suspender seu próprio acesso por esta tela';
  end if;

  update public.perfis set ativo = false where id = alvo;
end;
$$;

grant execute on function public.ibnf_suspender_usuario(uuid) to authenticated;

-- 6) O Financeiro passa a aceitar perfil padrão OU permissão individual.
-- Mantém compatibilidade com o módulo financeiro já existente.
create or replace function public.usuario_financeiro()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid()
      and ativo = true
      and (
        perfil in ('pastor','admin','tesouraria')
        or coalesce((permissoes->>'financeiro')::boolean,false) = true
      )
  );
$$;
