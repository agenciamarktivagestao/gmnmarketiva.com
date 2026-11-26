-- Marktiva · Ranking regional: em que posição o perfil aparece no Google Maps em cada ponto de uma grade ao redor do endereço.
-- O Google não informa a posição do perfil. A medição vem de uma varredura feita de tempos em tempos (hoje, a cada 15 dias)
-- por uma ferramenta de rastreio de posição, e o resultado é guardado aqui para o painel mostrar se o perfil sobe ou cai.
-- Tabela nova e aditiva: não mexe em nenhuma tabela que já existe.

create table public.desempenho_ranking (
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  dia            date not null,
  palavra        text not null check (length(btrim(palavra)) > 0),
  -- Grade quadrada de pontos de busca: ímpar, de 3x3 a 13x13. grade = 5 quer dizer 5x5 = 25 pontos.
  grade          smallint not null check (grade between 3 and 13 and grade % 2 = 1),
  -- Distância entre dois pontos vizinhos da grade, em km. Duas medições só se comparam com a mesma grade e a mesma distância.
  espacamento_km numeric(5, 2) not null check (espacamento_km > 0),
  -- Uma posição por ponto, linha a linha, começando no canto noroeste (linha 0 = norte, coluna 0 = oeste).
  -- Cada item: 1 a 20 = posição do perfil; 21 = fora das 20 primeiras; null = ponto que não foi lido (erro ou bloqueio).
  posicoes       jsonb not null,
  fonte          text not null default 'geogrid' check (length(btrim(fonte)) > 0),
  atualizado_em  timestamptz not null default now(),
  primary key (cliente_id, dia, palavra),
  check (jsonb_typeof(posicoes) = 'array' and jsonb_array_length(posicoes) = grade * grade),
  check (not jsonb_path_exists(posicoes, '$[*] ? (@ != null && (@.type() != "number" || @ < 1 || @ > 21 || @ != @.floor()))'))
);

comment on table public.desempenho_ranking is
  'Posição do perfil no Google Maps, ponto a ponto de uma grade, para uma palavra de busca em um dia. Uma linha por cliente, dia e palavra: medir de novo no mesmo dia regrava a linha.';
comment on column public.desempenho_ranking.posicoes is
  'Lista com grade x grade itens, do noroeste para o sudeste. 1 a 20 = posição; 21 = fora do top 20; null = ponto sem leitura.';

create index desempenho_ranking_por_dia on public.desempenho_ranking (dia);

alter table public.desempenho_ranking enable row level security;

create policy desempenho_ranking_ler    on public.desempenho_ranking for select to authenticated using ((select private.eh_equipe()));
create policy desempenho_ranking_criar  on public.desempenho_ranking for insert to authenticated with check ((select private.pode_editar()));
create policy desempenho_ranking_mudar  on public.desempenho_ranking for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy desempenho_ranking_apagar on public.desempenho_ranking for delete to authenticated using ((select private.eh_admin()));
