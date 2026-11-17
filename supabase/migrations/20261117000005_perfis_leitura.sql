-- Marktiva · Prévia do perfil: a última leitura do perfil do Google de cada cliente.
-- A rotina grava aqui uma foto do perfil a cada execução (nome, endereço, horário, serviços, fotos,
-- avaliações recentes). O painel só lê esta tabela para desenhar a prévia; não chama o Google.

create table public.perfis_leitura (
  cliente_id uuid primary key references public.clientes (id) on delete cascade,
  lido_em    timestamptz not null default now(),
  dados      jsonb not null default '{}'::jsonb
);

alter table public.perfis_leitura enable row level security;

create policy perfis_leitura_ler    on public.perfis_leitura for select to authenticated using ((select private.eh_equipe()));
create policy perfis_leitura_criar  on public.perfis_leitura for insert to authenticated with check ((select private.pode_editar()));
create policy perfis_leitura_mudar  on public.perfis_leitura for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy perfis_leitura_apagar on public.perfis_leitura for delete to authenticated using ((select private.eh_admin()));
