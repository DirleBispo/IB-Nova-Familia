alter table public.estudos
  add column if not exists materiais jsonb not null default '[]'::jsonb;

alter table public.estudos
  drop constraint if exists estudos_materiais_array_check;

alter table public.estudos
  add constraint estudos_materiais_array_check
  check (
    jsonb_typeof(materiais) = 'array'
    and jsonb_array_length(materiais) <= 8
  );

comment on column public.estudos.materiais is
  'Até 8 links HTTPS de materiais PDF ou PowerPoint armazenados externamente.';
