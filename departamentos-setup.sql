-- IB Nova Família — equipes dos departamentos
-- Execute uma única vez no SQL Editor do Supabase.

create table if not exists public.departamento_equipes (
  id uuid primary key default gen_random_uuid(),
  departamento text not null check (departamento in ('louvor','jovens','recepcao','visitas')),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  funcao text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (departamento,pessoa_id)
);

alter table public.departamento_equipes enable row level security;

drop policy if exists "equipe le departamentos" on public.departamento_equipes;
create policy "equipe le departamentos"
on public.departamento_equipes for select
using (public.tem_perfil(array['pastor','admin','secretaria','lider','tesouraria']));

drop policy if exists "administracao cadastra departamentos" on public.departamento_equipes;
create policy "administracao cadastra departamentos"
on public.departamento_equipes for insert
with check (public.tem_perfil(array['pastor','admin','secretaria']));

drop policy if exists "administracao atualiza departamentos" on public.departamento_equipes;
create policy "administracao atualiza departamentos"
on public.departamento_equipes for update
using (public.tem_perfil(array['pastor','admin','secretaria']))
with check (public.tem_perfil(array['pastor','admin','secretaria']));

drop policy if exists "administracao exclui departamentos" on public.departamento_equipes;
create policy "administracao exclui departamentos"
on public.departamento_equipes for delete
using (public.tem_perfil(array['pastor','admin','secretaria']));
