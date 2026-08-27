create table if not exists public.visitantes (
 id uuid primary key default gen_random_uuid(), nome text not null, telefone text, observacao text,
 status text not null default 'novo' check(status in ('novo','em_contato','concluido')),
 criado_em timestamptz not null default now()
);
create table if not exists public.quero_servir (
 id uuid primary key default gen_random_uuid(), nome text not null, telefone text not null, area text, observacao text,
 status text not null default 'novo' check(status in ('novo','em_contato','concluido')),
 criado_em timestamptz not null default now()
);
alter table public.visitantes enable row level security;
alter table public.quero_servir enable row level security;
drop policy if exists "visitante envia" on public.visitantes;
create policy "visitante envia" on public.visitantes for insert to anon,authenticated with check (true);
drop policy if exists "servir envia" on public.quero_servir;
create policy "servir envia" on public.quero_servir for insert to anon,authenticated with check (true);
drop policy if exists "admin ve visitantes" on public.visitantes;
create policy "admin ve visitantes" on public.visitantes for select to authenticated using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil in ('pastor','secretaria')));
drop policy if exists "admin ve servir" on public.quero_servir;
create policy "admin ve servir" on public.quero_servir for select to authenticated using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil in ('pastor','secretaria')));