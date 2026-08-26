-- IB Nova Família — configuração inicial do administrador
-- Execute uma única vez no SQL Editor do Supabase.

insert into public.perfis (id, nome, perfil, ativo)
select id, 'Dirlei Bispo', 'pastor', true
from auth.users
where email = 'dirleibispo@gmail.com'
on conflict (id) do update
set nome = excluded.nome,
    perfil = 'pastor',
    ativo = true;

-- Função auxiliar para verificar perfil da equipe sem repetir regras.
create or replace function public.tem_perfil(perfis_permitidos text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis p
    where p.id = auth.uid()
      and p.ativo = true
      and p.perfil = any(perfis_permitidos)
  );
$$;

-- Permite que cada usuário leia o próprio perfil.
drop policy if exists "usuario le proprio perfil" on public.perfis;
create policy "usuario le proprio perfil"
on public.perfis for select
using (auth.uid() = id or public.tem_perfil(array['pastor','secretaria']));

-- Pessoas: somente equipe autorizada.
drop policy if exists "equipe le pessoas" on public.pessoas;
drop policy if exists "equipe cadastra pessoas" on public.pessoas;
drop policy if exists "equipe atualiza pessoas" on public.pessoas;
create policy "equipe le pessoas"
on public.pessoas for select
using (public.tem_perfil(array['pastor','secretaria','lider','tesouraria']));
create policy "equipe cadastra pessoas"
on public.pessoas for insert
with check (public.tem_perfil(array['pastor','secretaria']));
create policy "equipe atualiza pessoas"
on public.pessoas for update
using (public.tem_perfil(array['pastor','secretaria']))
with check (public.tem_perfil(array['pastor','secretaria']));

-- Avisos: leitura pública; edição só administração.
drop policy if exists "avisos publicados sao publicos" on public.avisos;
drop policy if exists "equipe publica avisos" on public.avisos;
create policy "avisos publicados sao publicos"
on public.avisos for select
using (publicado = true or public.tem_perfil(array['pastor','secretaria']));
create policy "equipe publica avisos"
on public.avisos for insert
with check (public.tem_perfil(array['pastor','secretaria']));
create policy "equipe atualiza avisos"
on public.avisos for update
using (public.tem_perfil(array['pastor','secretaria']))
with check (public.tem_perfil(array['pastor','secretaria']));

-- Pedidos de oração e visitas: envio público; leitura da equipe pastoral/secretaria.
drop policy if exists "equipe le pedidos" on public.pedidos_oracao;
create policy "equipe le pedidos"
on public.pedidos_oracao for select
using (public.tem_perfil(array['pastor','secretaria','lider']));

drop policy if exists "equipe le visitas" on public.visitas;
create policy "equipe le visitas"
on public.visitas for select
using (public.tem_perfil(array['pastor','secretaria','lider']));
