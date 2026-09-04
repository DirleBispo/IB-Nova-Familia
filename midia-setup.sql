-- IB Nova Família — espaço da equipe de mídia
create extension if not exists pgcrypto;

create table if not exists public.midia_arquivos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  tipo text not null check (tipo in ('foto','documento','video_link')),
  arquivo_path text,
  url_externa text,
  mime_type text,
  tamanho bigint,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((arquivo_path is not null) or (url_externa is not null))
);

alter table public.midia_arquivos enable row level security;

create or replace function public.ibnf_usuario_ativo()
returns boolean language sql stable security definer set search_path=public
as $$select exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true)$$;

create or replace function public.ibnf_pode_gerenciar_midia()
returns boolean language sql stable security definer set search_path=public
as $$select exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo=true and p.perfil in ('pastor','admin','secretaria')) or exists(select 1 from public.departamento_lideres d where d.usuario_id=auth.uid() and d.departamento='midia')$$;

grant execute on function public.ibnf_usuario_ativo() to authenticated;
grant execute on function public.ibnf_pode_gerenciar_midia() to authenticated;

create policy "membros visualizam midia" on public.midia_arquivos for select to authenticated using (public.ibnf_usuario_ativo());
create policy "responsaveis inserem midia" on public.midia_arquivos for insert to authenticated with check (public.ibnf_pode_gerenciar_midia() and criado_por=auth.uid());
create policy "responsaveis atualizam midia" on public.midia_arquivos for update to authenticated using (public.ibnf_pode_gerenciar_midia()) with check (public.ibnf_pode_gerenciar_midia());
create policy "responsaveis excluem midia" on public.midia_arquivos for delete to authenticated using (public.ibnf_pode_gerenciar_midia());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('midia','midia',false,3145728,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;

create policy "membros leem arquivos da midia" on storage.objects for select to authenticated using (bucket_id='midia' and public.ibnf_usuario_ativo());
create policy "responsaveis enviam arquivos da midia" on storage.objects for insert to authenticated with check (bucket_id='midia' and public.ibnf_pode_gerenciar_midia());
create policy "responsaveis atualizam arquivos da midia" on storage.objects for update to authenticated using (bucket_id='midia' and public.ibnf_pode_gerenciar_midia()) with check (bucket_id='midia' and public.ibnf_pode_gerenciar_midia());
create policy "responsaveis excluem arquivos da midia" on storage.objects for delete to authenticated using (bucket_id='midia' and public.ibnf_pode_gerenciar_midia());

grant select,insert,update,delete on public.midia_arquivos to authenticated;
