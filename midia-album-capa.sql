-- Permite usar uma foto do Google Drive como capa de um álbum.
alter table public.midia_arquivos
  add column if not exists capa_url text;
