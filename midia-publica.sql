-- Leitura pública da equipe e dos links da mídia.
-- Adicionar, editar e excluir continuam exigindo usuário autorizado.
create policy "publico visualiza arquivos da midia"
on public.midia_arquivos
for select
to anon
using (true);

grant select on public.midia_arquivos to anon;

create or replace view public.midia_equipe_publica
with (security_barrier = true, security_invoker = false)
as
select de.id, p.nome, de.funcao
from public.departamento_equipes de
join public.pessoas p on p.id = de.pessoa_id
where de.departamento = 'midia';

revoke all on public.midia_equipe_publica from public;
grant select on public.midia_equipe_publica to anon, authenticated;
