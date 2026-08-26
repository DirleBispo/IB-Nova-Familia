create extension if not exists pgcrypto;

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  perfil text not null default 'membro' check (perfil in ('pastor','secretaria','tesouraria','lider','membro')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  nascimento date,
  email text,
  endereco text,
  tipo text not null default 'membro' check (tipo in ('membro','visitante')),
  ativo boolean not null default true,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text not null,
  publicado boolean not null default true,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.pedidos_oracao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pedido text not null,
  telefone text,
  status text not null default 'novo' check (status in ('novo','em_acompanhamento','concluido')),
  criado_em timestamptz not null default now()
);

create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  observacao text,
  status text not null default 'solicitada' check (status in ('solicitada','agendada','realizada','cancelada')),
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;
alter table public.pessoas enable row level security;
alter table public.avisos enable row level security;
alter table public.pedidos_oracao enable row level security;
alter table public.visitas enable row level security;

create policy "usuario le proprio perfil" on public.perfis for select using (auth.uid() = id);
create policy "equipe le pessoas" on public.pessoas for select using (auth.role() = 'authenticated');
create policy "equipe cadastra pessoas" on public.pessoas for insert with check (auth.role() = 'authenticated');
create policy "equipe atualiza pessoas" on public.pessoas for update using (auth.role() = 'authenticated');
create policy "avisos publicados sao publicos" on public.avisos for select using (publicado = true or auth.role() = 'authenticated');
create policy "equipe publica avisos" on public.avisos for insert with check (auth.role() = 'authenticated');
create policy "pedido de oracao publico" on public.pedidos_oracao for insert with check (true);
create policy "equipe le pedidos" on public.pedidos_oracao for select using (auth.role() = 'authenticated');
create policy "visita publica" on public.visitas for insert with check (true);
create policy "equipe le visitas" on public.visitas for select using (auth.role() = 'authenticated');
