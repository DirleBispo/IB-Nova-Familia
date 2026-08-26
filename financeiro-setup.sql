create table if not exists public.financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  tipo text not null check (tipo in ('entrada','saida')),
  categoria text not null,
  descricao text not null,
  valor numeric(12,2) not null check (valor > 0),
  forma_pagamento text,
  observacao text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.financeiro_lancamentos enable row level security;

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
      and perfil in ('pastor','tesouraria')
  );
$$;

drop policy if exists "financeiro le" on public.financeiro_lancamentos;
drop policy if exists "financeiro insere" on public.financeiro_lancamentos;
drop policy if exists "financeiro atualiza" on public.financeiro_lancamentos;
drop policy if exists "financeiro exclui" on public.financeiro_lancamentos;

create policy "financeiro le"
on public.financeiro_lancamentos for select
using (public.usuario_financeiro());

create policy "financeiro insere"
on public.financeiro_lancamentos for insert
with check (public.usuario_financeiro() and criado_por = auth.uid());

create policy "financeiro atualiza"
on public.financeiro_lancamentos for update
using (public.usuario_financeiro())
with check (public.usuario_financeiro());

create policy "financeiro exclui"
on public.financeiro_lancamentos for delete
using (public.usuario_financeiro());

create index if not exists financeiro_lancamentos_data_idx on public.financeiro_lancamentos(data desc);
create index if not exists financeiro_lancamentos_tipo_idx on public.financeiro_lancamentos(tipo);
