-- Mantém o perfil Secretaria restrito às funções do painel da Secretaria.
create or replace function public.gerencia_departamento(departamento_alvo text)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.tem_perfil(array['pastor','admin']::text[])
    or exists (
      select 1 from public.departamento_lideres dl
      where dl.usuario_id = auth.uid() and dl.departamento = departamento_alvo
    );
$$;

drop policy if exists "usuario le propria lideranca" on public.departamento_lideres;
create policy "usuario le propria lideranca" on public.departamento_lideres
for select using (
  usuario_id = auth.uid()
  or public.tem_perfil(array['pastor','admin']::text[])
);

create or replace function public.ibnf_pode_gerenciar_midia()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.perfis p
    where p.id=auth.uid() and p.ativo=true and p.perfil in ('pastor','admin')
  ) or exists(
    select 1 from public.departamento_lideres d
    where d.usuario_id=auth.uid() and d.departamento='midia'
  );
$$;

