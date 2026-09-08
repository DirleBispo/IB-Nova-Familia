-- IB Nova Família — destaque editável do próximo evento
create table if not exists public.evento_destaque (
  id integer primary key default 1 check (id = 1),
  etiqueta text not null default 'Próximo evento', titulo text not null,
  data_evento timestamptz, descricao text, texto_botao text not null default 'Saiba mais',
  link_url text, imagem_url text, ativo boolean not null default true,
  atualizado_por uuid references auth.users(id), atualizado_em timestamptz not null default now()
);
alter table public.evento_destaque enable row level security;
drop policy if exists "evento destaque leitura publica" on public.evento_destaque;
create policy "evento destaque leitura publica" on public.evento_destaque for select to anon, authenticated using (true);
drop policy if exists "evento destaque administradores inserem" on public.evento_destaque;
create policy "evento destaque administradores inserem" on public.evento_destaque for insert to authenticated with check (
  exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and
    (p.perfil in ('pastor','admin','secretaria') or coalesce((p.permissoes->>'agenda')::boolean,false)))
);
drop policy if exists "evento destaque administradores editam" on public.evento_destaque;
create policy "evento destaque administradores editam" on public.evento_destaque for update to authenticated using (
  exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and
    (p.perfil in ('pastor','admin','secretaria') or coalesce((p.permissoes->>'agenda')::boolean,false)))
) with check (
  exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and
    (p.perfil in ('pastor','admin','secretaria') or coalesce((p.permissoes->>'agenda')::boolean,false)))
);
grant select on public.evento_destaque to anon, authenticated;
grant insert, update on public.evento_destaque to authenticated;

insert into public.evento_destaque (id,etiqueta,titulo,descricao,texto_botao,link_url,ativo)
values (1,'Campanha especial','24 Horas de Oração','Escolha uma hora e participe conosco.','Quero participar','https://ibnovafamilia.com.br/oracao.html',true)
on conflict (id) do nothing;
do $$ begin
  alter publication supabase_realtime add table public.evento_destaque;
exception when duplicate_object then null;
end $$;
