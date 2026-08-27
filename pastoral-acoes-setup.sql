-- Permissões administrativas para o Painel Pastoral
-- Execute uma vez no SQL Editor do Supabase.

-- VISITANTES
alter table public.visitantes enable row level security;
drop policy if exists "pastor atualiza visitantes" on public.visitantes;
create policy "pastor atualiza visitantes" on public.visitantes
for update to authenticated
using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'))
with check (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'));
drop policy if exists "pastor exclui visitantes" on public.visitantes;
create policy "pastor exclui visitantes" on public.visitantes
for delete to authenticated
using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'));

-- QUERO SERVIR
alter table public.quero_servir enable row level security;
drop policy if exists "pastor atualiza quero servir" on public.quero_servir;
create policy "pastor atualiza quero servir" on public.quero_servir
for update to authenticated
using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'))
with check (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'));
drop policy if exists "pastor exclui quero servir" on public.quero_servir;
create policy "pastor exclui quero servir" on public.quero_servir
for delete to authenticated
using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'));

-- PEDIDOS DE ORAÇÃO
alter table public.pedidos_oracao enable row level security;
drop policy if exists "pastor atualiza oracoes" on public.pedidos_oracao;
create policy "pastor atualiza oracoes" on public.pedidos_oracao
for update to authenticated
using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'))
with check (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'));
drop policy if exists "pastor exclui oracoes" on public.pedidos_oracao;
create policy "pastor exclui oracoes" on public.pedidos_oracao
for delete to authenticated
using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'));

-- VISITAS
aLter table public.visitas enable row level security;
drop policy if exists "pastor atualiza visitas" on public.visitas;
create policy "pastor atualiza visitas" on public.visitas
for update to authenticated
using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'))
with check (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'));
drop policy if exists "pastor exclui visitas" on public.visitas;
create policy "pastor exclui visitas" on public.visitas
for delete to authenticated
using (exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil='pastor'));