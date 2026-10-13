create table if not exists public.financeiro_fechamentos (
 id uuid primary key default gen_random_uuid(),
 mes text not null unique check (mes ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' and mes >= '2026-09'),
 destinatario text not null default 'financeiro@contabilidadechapetta.com.br' check (destinatario='financeiro@contabilidadechapetta.com.br'),
 status text not null default 'rascunho' check(status in ('rascunho','pronto','aprovado','enviando','enviado')),
 revisao integer not null default 1,
 lancamentos jsonb not null default '[]',
 documentos jsonb not null default '[]',
 entradas numeric(14,2) not null default 0,
 saidas numeric(14,2) not null default 0,
 pasta_url text,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 aprovado_por uuid references auth.users(id),
 aprovado_em timestamptz,
 enviado_em timestamptz,
 send_ticket text,
 ticket_expira_em timestamptz,
 retorno_envio jsonb
);
alter table public.financeiro_fechamentos enable row level security;
revoke all on public.financeiro_fechamentos from anon,authenticated;
grant all on public.financeiro_fechamentos to service_role;

create or replace function public.ibnf_prepare_closing(p_mes text,p_replace boolean default false)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.financeiro_fechamentos; closing_id uuid; d date; rows_json jsonb; e numeric; s numeric;
begin
 if p_mes !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' or p_mes < '2026-09' then raise exception 'Mes invalido'; end if;
 d:=(p_mes||'-01')::date;
 if d >= date_trunc('month',now() at time zone 'America/Sao_Paulo') then raise exception 'O mes ainda nao terminou'; end if;
 perform pg_advisory_xact_lock(hashtext('ibnf_closing_'||p_mes));
 select * into existing from public.financeiro_fechamentos where mes=p_mes for update;
 if existing.id is not null and not p_replace then return existing.id; end if;
 if existing.id is not null and existing.status not in ('rascunho','pronto') then raise exception 'Fechamento aprovado nao pode ser substituido'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('data',data,'tipo',tipo,'categoria',categoria,'descricao',descricao,'pessoa_nome',pessoa_nome,'forma_pagamento',forma_pagamento,'observacao',observacao,'valor',valor) order by data,criado_em,id),'[]'),
 coalesce(sum(valor) filter(where tipo='entrada'),0),coalesce(sum(valor) filter(where tipo='saida'),0)
 into rows_json,e,s from public.financeiro_lancamentos where data>=d and data<(d+interval '1 month');
 if existing.id is null then
 insert into public.financeiro_fechamentos(mes,lancamentos,entradas,saidas) values(p_mes,rows_json,e,s) returning id into closing_id;
 else
 update public.financeiro_fechamentos set lancamentos=rows_json,entradas=e,saidas=s,documentos='[]',pasta_url=null,status='rascunho',revisao=revisao+1,atualizado_em=now() where id=existing.id returning id into closing_id;
 end if;
 return closing_id;
end $$;
revoke execute on function public.ibnf_prepare_closing(text,boolean) from public,anon,authenticated;
grant execute on function public.ibnf_prepare_closing(text,boolean) to service_role;

create extension if not exists pg_cron;
select cron.schedule('ibnf-fechamento-dia-5','0 10 5 * *', $job$select public.ibnf_prepare_closing(to_char((now() at time zone 'America/Sao_Paulo')-interval '1 month','YYYY-MM'),false);$job$);
select public.ibnf_prepare_closing('2026-09',false);
