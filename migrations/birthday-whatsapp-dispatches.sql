-- Execute no SQL Editor do Supabase antes de habilitar a rotina.
-- Somente a chave service_role do backend acessa esta tabela.
create table if not exists public.birthday_whatsapp_dispatches (
  dispatch_key text primary key,
  status text not null check (status in ('processing','submitted','failed')),
  created_at timestamptz not null default now()
);
alter table public.birthday_whatsapp_dispatches enable row level security;
-- Sem policies: acessos anon/authenticated não conseguem ler nem alterar.
