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

-- Evolução do módulo financeiro: vínculo opcional com membro e categoria estruturada.
alter table public.financeiro_lancamentos
  add column if not exists pessoa_id uuid references public.pessoas(id) on delete set null,
  add column if not exists pessoa_nome text,
  add column if not exists categoria_id uuid;

create table if not exists public.financeiro_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('entrada','saida')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (nome, tipo)
);

-- A FK é criada separadamente para manter o script idempotente em bancos já existentes.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'financeiro_lancamentos_categoria_id_fkey'
  ) then
    alter table public.financeiro_lancamentos
      add constraint financeiro_lancamentos_categoria_id_fkey
      foreign key (categoria_id) references public.financeiro_categorias(id) on delete set null;
  end if;
end $$;

insert into public.financeiro_categorias (nome,tipo) values
  ('Dízimo','entrada'),
  ('Oferta','entrada'),
  ('Oferta Missionária','entrada'),
  ('Oferta de Culto','entrada'),
  ('Oferta Especial','entrada'),
  ('Doação','entrada'),
  ('Evento','entrada'),
  ('Cantina','entrada'),
  ('Outras Entradas','entrada'),
  ('Água','saida'),
  ('Energia','saida'),
  ('Aluguel','saida'),
  ('Manutenção','saida'),
  ('Material de limpeza','saida'),
  ('Som/Mídia','saida'),
  ('Ministério Infantil','saida'),
  ('Missões','saida'),
  ('Ajuda Social','saida'),
  ('Evento','saida'),
  ('Compra de equipamento','saida'),
  ('Transporte','saida'),
  ('Outras Despesas','saida')
on conflict (nome,tipo) do nothing;

alter table public.financeiro_lancamentos enable row level security;
alter table public.financeiro_categorias enable row level security;

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

drop policy if exists "financeiro categorias le" on public.financeiro_categorias;
drop policy if exists "financeiro categorias insere" on public.financeiro_categorias;
drop policy if exists "financeiro categorias atualiza" on public.financeiro_categorias;

create policy "financeiro categorias le"
on public.financeiro_categorias for select
using (public.usuario_financeiro());

create policy "financeiro categorias insere"
on public.financeiro_categorias for insert
with check (public.usuario_financeiro());

create policy "financeiro categorias atualiza"
on public.financeiro_categorias for update
using (public.usuario_financeiro())
with check (public.usuario_financeiro());

create index if not exists financeiro_lancamentos_data_idx on public.financeiro_lancamentos(data desc);
create index if not exists financeiro_lancamentos_tipo_idx on public.financeiro_lancamentos(tipo);
create index if not exists financeiro_lancamentos_pessoa_idx on public.financeiro_lancamentos(pessoa_id);
create index if not exists financeiro_lancamentos_categoria_idx on public.financeiro_lancamentos(categoria_id);
