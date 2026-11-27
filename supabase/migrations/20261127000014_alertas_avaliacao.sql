-- Marktiva · Alertas de avaliação ruim: o que a rotina achou de ruim nos perfis e ainda espera uma decisão da equipe.
-- Entra aqui a avaliação de nota baixa (3 estrelas ou menos) ou com comentário negativo, mesmo com nota alta.
-- A rotina da madrugada grava (uma linha por avaliação) e não responde essas avaliações; a equipe decide como recorrer
-- e marca como tratada. É uso interno: não aparece no relatório nem no link público do cliente.

create table public.alertas_avaliacao (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  review_id      text,
  avaliador      text not null check (char_length(avaliador) between 1 and 120),
  estrelas       integer not null check (estrelas between 1 and 5),
  texto          text check (char_length(texto) <= 1000),
  avaliada_em    date,
  motivo         text not null check (motivo in ('nota', 'comentario', 'nota_e_comentario')),
  motivo_detalhe text check (char_length(motivo_detalhe) <= 300),
  situacao       text not null default 'nova' check (situacao in ('nova', 'tratada')),
  detectada_em   timestamptz not null default now(),
  execucao_id    uuid references public.execucoes (id) on delete set null,
  tratada_em     timestamptz,
  tratada_por    text,
  desfecho       text check (char_length(desfecho) <= 300),
  check (situacao = 'nova' or tratada_em is not null)
);

comment on table public.alertas_avaliacao is
  'Avaliações ruins (nota 3 ou menos, ou comentário negativo) que esperam decisão da equipe. A rotina grava e nunca responde essas avaliações. review_id é o id do Google; fica nulo quando o alerta foi lançado à mão.';
comment on column public.alertas_avaliacao.motivo is
  'nota = só a nota baixa; comentario = nota 4 ou 5 com comentário negativo; nota_e_comentario = nota baixa e comentário negativo.';
comment on column public.alertas_avaliacao.desfecho is
  'Como a equipe tratou: respondeu, denunciou ao Google, deixou como está. Texto livre, até 300 caracteres.';

-- Uma avaliação do Google gera um alerta só: a rotina pode rodar de novo sem duplicar
create unique index alertas_avaliacao_review_unico
  on public.alertas_avaliacao (cliente_id, review_id)
  where review_id is not null;

create index alertas_avaliacao_situacao on public.alertas_avaliacao (situacao, detectada_em desc);
create index alertas_avaliacao_cliente on public.alertas_avaliacao (cliente_id);

alter table public.alertas_avaliacao enable row level security;

create policy alertas_avaliacao_ler    on public.alertas_avaliacao for select to authenticated using ((select private.eh_equipe()));
create policy alertas_avaliacao_criar  on public.alertas_avaliacao for insert to authenticated with check ((select private.pode_editar()));
create policy alertas_avaliacao_mudar  on public.alertas_avaliacao for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy alertas_avaliacao_apagar on public.alertas_avaliacao for delete to authenticated using ((select private.eh_admin()));
