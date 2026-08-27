-- =====================================================
-- IBNF - CORRECAO DE RLS DA TABELA PERFIS
-- Evita recursao de policies ao consultar o proprio perfil
-- Execute uma vez no SQL Editor do Supabase
-- =====================================================

-- 1) Funcao segura para saber se o usuario atual e Pastor/Admin ativo.
-- SECURITY DEFINER evita consultar public.perfis de dentro da propria policy.
create or replace function public.ibnf_eh_admin()
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
       and p.perfil in ('pastor','admin')
  );
$$;

grant execute on function public.ibnf_eh_admin() to authenticated;

-- 2) Mantem RLS ativo
alter table public.perfis enable row level security;

-- 3) Remove policies que consultavam public.perfis dentro da propria policy
-- e podiam gerar "infinite recursion detected in policy for relation perfis".
drop policy if exists "usuario ve proprio perfil" on public.perfis;
drop policy if exists "pastor lista perfis" on public.perfis;
drop policy if exists "pastor atualiza perfis" on public.perfis;

-- 4) Cada usuario autenticado pode ler somente o proprio perfil.
create policy "usuario ve proprio perfil"
on public.perfis
for select
to authenticated
using (id = auth.uid());

-- 5) Pastor/Admin ativo pode listar todos os perfis.
create policy "pastor lista perfis"
on public.perfis
for select
to authenticated
using (public.ibnf_eh_admin());

-- 6) Pastor/Admin ativo pode alterar perfis e permissoes.
create policy "pastor atualiza perfis"
on public.perfis
for update
to authenticated
using (public.ibnf_eh_admin())
with check (public.ibnf_eh_admin());

-- 7) Confirma o perfil principal sem depender das policies do app.
insert into public.perfis (
  id,
  nome,
  perfil,
  ativo,
  permissoes,
  aprovado_em
)
select
  id,
  'Dirlei Bispo',
  'pastor',
  true,
  '{"financeiro": true, "pessoas": true, "pastoral": true, "acessos": true, "usuarios": true}'::jsonb,
  now()
from auth.users
where email = 'dirleibispo@gmail.com'
on conflict (id) do update set
  nome = 'Dirlei Bispo',
  perfil = 'pastor',
  ativo = true,
  permissoes = '{"financeiro": true, "pessoas": true, "pastoral": true, "acessos": true, "usuarios": true}'::jsonb,
  aprovado_em = now();

-- 8) Consulta de verificacao no SQL Editor.
select
  u.email,
  p.nome,
  p.perfil,
  p.ativo,
  p.permissoes
from auth.users u
left join public.perfis p on p.id = u.id
where u.email = 'dirleibispo@gmail.com';
