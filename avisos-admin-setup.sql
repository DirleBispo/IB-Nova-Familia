-- IB Nova Família — permissões para criar e editar avisos
-- Execute uma vez no SQL Editor do Supabase.

create or replace function public.usuario_gerencia_avisos()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and (
        p.perfil in ('pastor','admin','secretaria')
        or coalesce((p.permissoes->>'avisos')::boolean,false) = true
      )
  );
$$;

grant execute on function public.usuario_gerencia_avisos() to anon, authenticated;

alter table public.avisos enable row level security;

drop policy if exists "avisos publicados sao publicos" on public.avisos;
drop policy if exists "equipe publica avisos" on public.avisos;
drop policy if exists "equipe atualiza avisos" on public.avisos;

create policy "avisos publicados sao publicos"
on public.avisos for select
to anon, authenticated
using (publicado = true or public.usuario_gerencia_avisos());

create policy "equipe publica avisos"
on public.avisos for insert
to authenticated
with check (public.usuario_gerencia_avisos());

create policy "equipe atualiza avisos"
on public.avisos for update
to authenticated
using (public.usuario_gerencia_avisos())
with check (public.usuario_gerencia_avisos());
