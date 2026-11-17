-- Tipo de resposta que cada pendência pede (kind), os dados que o painel mostra (payload)
-- e o que a equipe respondeu (resposta). Tudo opcional: a rotina continua lendo apenas
-- status e comentários, e pendências sem kind aparecem como "approve", como sempre.
alter table public.pendencias
  add column if not exists kind     text check (kind in ('approve', 'choose', 'input', 'upload', 'external')),
  add column if not exists payload  jsonb,
  add column if not exists resposta jsonb;

comment on column public.pendencias.kind is 'approve | choose | input | upload | external. Nulo = approve.';
comment on column public.pendencias.payload is 'Dados da pergunta: rótulo do botão, opções, campos, proporção da foto, onde resolver.';
comment on column public.pendencias.resposta is 'O que a equipe respondeu pelo painel (valor e resumo em texto).';
