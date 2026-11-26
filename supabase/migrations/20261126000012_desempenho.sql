-- Marktiva · Desempenho dos perfis: a memória do que o Google mostra de cada cliente ao longo do tempo.
-- O Windsor entrega só os últimos 30 dias; a rotina grava aqui o que lê, todo dia, para o painel mostrar a evolução.
-- Só a rotina e a equipe gravam. O painel apenas lê.

-- Números por dia (o Google conta pessoas únicas por dia em cada lugar onde o perfil apareceu)
create table public.desempenho_diario (
  cliente_id    uuid not null references public.clientes (id) on delete cascade,
  dia           date not null,
  maps_pc       integer not null default 0 check (maps_pc >= 0),
  busca_pc      integer not null default 0 check (busca_pc >= 0),
  maps_cel      integer not null default 0 check (maps_cel >= 0),
  busca_cel     integer not null default 0 check (busca_cel >= 0),
  ligacoes      integer not null default 0 check (ligacoes >= 0),
  cliques_site  integer not null default 0 check (cliques_site >= 0),
  rotas         integer not null default 0 check (rotas >= 0),
  reservas      integer not null default 0 check (reservas >= 0),
  atualizado_em timestamptz not null default now(),
  primary key (cliente_id, dia)
);

comment on table public.desempenho_diario is
  'Impressões (Maps/Busca, computador/celular), ligações, cliques no site, rotas e reservas por dia. O Google demora cerca de 3 dias para fechar um dia: a rotina grava até hoje-3 e regrava os últimos 30 dias a cada noite.';

-- Termos que as pessoas pesquisaram para encontrar o perfil, por mês (o Google só informa o mês fechado)
create table public.desempenho_termos (
  cliente_id    uuid not null references public.clientes (id) on delete cascade,
  mes           date not null check (mes = date_trunc('month', mes)::date),
  termo         text not null,
  usuarios      integer check (usuarios >= 0),
  abaixo_de     integer check (abaixo_de > 0),
  atualizado_em timestamptz not null default now(),
  primary key (cliente_id, mes, termo),
  -- O Google informa o número de pessoas OU só que foi menos que um limite (em geral 15)
  check (usuarios is not null or abaixo_de is not null)
);

comment on table public.desempenho_termos is
  'Termos de busca por mês. mes é sempre o dia 1. usuarios = pessoas únicas; abaixo_de = o Google só disse "menos que N".';

-- Nota e quantidade de avaliações, uma leitura por dia
create table public.desempenho_reputacao (
  cliente_id       uuid not null references public.clientes (id) on delete cascade,
  dia              date not null,
  nota             numeric(3, 2) check (nota between 0 and 5),
  total_avaliacoes integer check (total_avaliacoes >= 0),
  atualizado_em    timestamptz not null default now(),
  primary key (cliente_id, dia)
);

comment on table public.desempenho_reputacao is
  'Nota média e total de avaliações do perfil no dia da leitura. Diferente do desempenho diário, aqui só existe o valor de quando a rotina leu.';

alter table public.desempenho_diario     enable row level security;
alter table public.desempenho_termos     enable row level security;
alter table public.desempenho_reputacao  enable row level security;

create policy desempenho_diario_ler    on public.desempenho_diario for select to authenticated using ((select private.eh_equipe()));
create policy desempenho_diario_criar  on public.desempenho_diario for insert to authenticated with check ((select private.pode_editar()));
create policy desempenho_diario_mudar  on public.desempenho_diario for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy desempenho_diario_apagar on public.desempenho_diario for delete to authenticated using ((select private.eh_admin()));

create policy desempenho_termos_ler    on public.desempenho_termos for select to authenticated using ((select private.eh_equipe()));
create policy desempenho_termos_criar  on public.desempenho_termos for insert to authenticated with check ((select private.pode_editar()));
create policy desempenho_termos_mudar  on public.desempenho_termos for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy desempenho_termos_apagar on public.desempenho_termos for delete to authenticated using ((select private.eh_admin()));

create policy desempenho_reputacao_ler    on public.desempenho_reputacao for select to authenticated using ((select private.eh_equipe()));
create policy desempenho_reputacao_criar  on public.desempenho_reputacao for insert to authenticated with check ((select private.pode_editar()));
create policy desempenho_reputacao_mudar  on public.desempenho_reputacao for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy desempenho_reputacao_apagar on public.desempenho_reputacao for delete to authenticated using ((select private.eh_admin()));
