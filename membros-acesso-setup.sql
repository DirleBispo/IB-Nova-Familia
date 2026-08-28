-- IB Nova Família - vínculo seguro entre membro existente e conta de acesso
-- Execute uma vez no SQL Editor do Supabase.
-- Não altera as políticas RLS existentes.

create or replace function public.ibnf_buscar_perfil_por_email(email_busca text)
returns table (
  id uuid,
  perfil text,
  ativo boolean,
  permissoes jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.ibnf_eh_admin() then
    raise exception 'Somente Pastor/Administrador pode consultar contas de acesso';
  end if;

  return query
  select p.id, p.perfil, p.ativo, coalesce(p.permissoes,'{}'::jsonb)
  from auth.users u
  join public.perfis p on p.id = u.id
  where lower(u.email) = lower(trim(email_busca))
  limit 1;
end;
$$;

revoke all on function public.ibnf_buscar_perfil_por_email(text) from public;
grant execute on function public.ibnf_buscar_perfil_por_email(text) to authenticated;

select 'Acesso de membros existentes configurado com sucesso' as resultado;