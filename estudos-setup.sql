create table if not exists public.estudos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  referencia text,
  autor text,
  resumo text,
  conteudo text not null,
  data_estudo date not null default current_date,
  publicado boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.estudos enable row level security;

create or replace function public.usuario_gerencia_estudos()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and ativo = true
      and (perfil in ('pastor','admin','secretaria') or coalesce((permissoes->>'estudos')::boolean,false))
  );
$$;

drop policy if exists "Estudos publicados são públicos" on public.estudos;
create policy "Estudos publicados são públicos" on public.estudos for select using (publicado = true or public.usuario_gerencia_estudos());
drop policy if exists "Equipe pode criar estudos" on public.estudos;
create policy "Equipe pode criar estudos" on public.estudos for insert to authenticated with check (public.usuario_gerencia_estudos());
drop policy if exists "Equipe pode editar estudos" on public.estudos;
create policy "Equipe pode editar estudos" on public.estudos for update to authenticated using (public.usuario_gerencia_estudos()) with check (public.usuario_gerencia_estudos());
drop policy if exists "Equipe pode excluir estudos" on public.estudos;
create policy "Equipe pode excluir estudos" on public.estudos for delete to authenticated using (public.usuario_gerencia_estudos());
