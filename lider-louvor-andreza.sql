-- Libera Andreza Marques para administrar somente a equipe do Louvor.

create table if not exists public.departamento_lideres (
  departamento text not null,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (departamento, usuario_id)
);

alter table public.departamento_lideres enable row level security;

create or replace function public.gerencia_departamento(departamento_alvo text)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.tem_perfil(array['pastor','admin','secretaria']::text[])
    or exists (
      select 1 from public.departamento_lideres dl
      where dl.usuario_id = auth.uid() and dl.departamento = departamento_alvo
    );
$$;

drop policy if exists "usuario le propria lideranca" on public.departamento_lideres;
create policy "usuario le propria lideranca" on public.departamento_lideres
for select using (usuario_id = auth.uid() or public.tem_perfil(array['pastor','admin','secretaria']::text[]));

drop policy if exists "lider de departamento le pessoas" on public.pessoas;
create policy "lider de departamento le pessoas" on public.pessoas
for select using (exists (select 1 from public.departamento_lideres dl where dl.usuario_id = auth.uid()));

drop policy if exists "administracao cadastra departamentos" on public.departamento_equipes;
create policy "administracao cadastra departamentos" on public.departamento_equipes
for insert with check (public.gerencia_departamento(departamento));

drop policy if exists "administracao atualiza departamentos" on public.departamento_equipes;
create policy "administracao atualiza departamentos" on public.departamento_equipes
for update using (public.gerencia_departamento(departamento))
with check (public.gerencia_departamento(departamento));

drop policy if exists "administracao exclui departamentos" on public.departamento_equipes;
create policy "administracao exclui departamentos" on public.departamento_equipes
for delete using (public.gerencia_departamento(departamento));

insert into public.departamento_lideres (departamento, usuario_id)
select 'louvor', id from auth.users
where lower(email) = 'andrezamarques808@yahoo.com'
on conflict (departamento, usuario_id) do nothing;
