-- Marktiva · Novidades: o registro do que foi mudado no painel, no banco e nas rotinas.
-- Cada ajuste vira uma linha (o que mudou, como conferir, o que falta). O painel mostra em /novidades
-- e avisa no menu quantas a pessoa ainda não viu. A migration só adiciona; nada existente é alterado.

create table public.mudancas_sistema (
  id          uuid primary key default gen_random_uuid(),
  feito_em    timestamptz not null default now(),
  titulo      text not null,
  resumo      text not null,
  itens       text[] not null default '{}',
  como_testar text,
  pendente    text,
  tipo        text not null default 'painel' check (tipo in ('painel', 'dados', 'rotina')),
  commit_sha  text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{7,40}$'),
  autor       text not null default 'Claude'
);

create index mudancas_sistema_feito_em_idx on public.mudancas_sistema (feito_em desc);

alter table public.mudancas_sistema enable row level security;

create policy mudancas_sistema_ler    on public.mudancas_sistema for select to authenticated using ((select private.eh_equipe()));
create policy mudancas_sistema_criar  on public.mudancas_sistema for insert to authenticated with check ((select private.eh_admin()));
create policy mudancas_sistema_mudar  on public.mudancas_sistema for update to authenticated using ((select private.eh_admin())) with check ((select private.eh_admin()));
create policy mudancas_sistema_apagar on public.mudancas_sistema for delete to authenticated using ((select private.eh_admin()));

-- Até quando cada pessoa da equipe já viu as novidades (é o que faz o selo do menu)
create table public.mudancas_vistas (
  email     text primary key,
  visto_ate timestamptz not null default now()
);

alter table public.mudancas_vistas enable row level security;

create policy mudancas_vistas_ler   on public.mudancas_vistas for select to authenticated
  using (email = lower((select auth.jwt() ->> 'email')) and (select private.eh_equipe()));
create policy mudancas_vistas_criar on public.mudancas_vistas for insert to authenticated
  with check (email = lower((select auth.jwt() ->> 'email')) and (select private.eh_equipe()));
create policy mudancas_vistas_mudar on public.mudancas_vistas for update to authenticated
  using (email = lower((select auth.jwt() ->> 'email')) and (select private.eh_equipe()))
  with check (email = lower((select auth.jwt() ->> 'email')) and (select private.eh_equipe()));
