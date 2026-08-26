-- IB Nova Família
-- Função pública segura: retorna somente o nome de membros que fazem aniversário hoje.
-- Não expõe telefone, e-mail, endereço, ano de nascimento ou idade.

create or replace function public.aniversariantes_hoje()
returns table (nome text)
language sql
security definer
set search_path = public
stable
as $$
  select p.nome
  from public.pessoas p
  where p.ativo = true
    and p.tipo = 'membro'
    and p.nascimento is not null
    and extract(month from p.nascimento) = extract(month from current_date)
    and extract(day from p.nascimento) = extract(day from current_date)
  order by p.nome;
$$;

grant execute on function public.aniversariantes_hoje() to anon, authenticated;
