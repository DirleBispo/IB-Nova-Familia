create table if not exists public.agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo text not null default 'unico' check (tipo in ('unico','recorrente')),
  data_evento date,
  dia_semana smallint check (dia_semana between 0 and 6),
  hora time not null,
  local text,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((tipo = 'unico' and data_evento is not null and dia_semana is null) or (tipo = 'recorrente' and dia_semana is not null and data_evento is null))
);

alter table public.agenda_eventos enable row level security;

create or replace function public.usuario_gerencia_agenda()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and ativo = true
      and (perfil in ('pastor','admin','secretaria') or coalesce((permissoes->>'agenda')::boolean,false))
  );
$$;

drop policy if exists "Agenda publica pode ser consultada" on public.agenda_eventos;
create policy "Agenda publica pode ser consultada" on public.agenda_eventos for select using (ativo = true or public.usuario_gerencia_agenda());
drop policy if exists "Equipe pode criar agenda" on public.agenda_eventos;
create policy "Equipe pode criar agenda" on public.agenda_eventos for insert to authenticated with check (public.usuario_gerencia_agenda());
drop policy if exists "Equipe pode editar agenda" on public.agenda_eventos;
create policy "Equipe pode editar agenda" on public.agenda_eventos for update to authenticated using (public.usuario_gerencia_agenda()) with check (public.usuario_gerencia_agenda());
drop policy if exists "Equipe pode excluir agenda" on public.agenda_eventos;
create policy "Equipe pode excluir agenda" on public.agenda_eventos for delete to authenticated using (public.usuario_gerencia_agenda());

insert into public.agenda_eventos (titulo,tipo,dia_semana,hora,local)
select item.titulo,'recorrente',item.dia,item.hora::time,'Templo principal'
from (values
  ('Escola Bíblica Dominical',0,'09:00'),
  ('Culto da Família',0,'19:00'),
  ('Culto de Ensino',3,'19:30'),
  ('Culto de Oração',5,'19:30')
) as item(titulo,dia,hora)
where not exists (select 1 from public.agenda_eventos existing where existing.titulo=item.titulo and existing.tipo='recorrente');
