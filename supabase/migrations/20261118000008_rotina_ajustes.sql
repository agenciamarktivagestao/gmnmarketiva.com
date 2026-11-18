-- Marktiva · Ajustes da rotina da madrugada.
-- A equipe decide no painel (tela Rotina) o que a rotina pode fazer; a rotina lê estas duas tabelas no começo da noite.
-- rotina_ajustes tem uma linha só (id = 1). rotina_clientes só tem linha para o cliente que foi mudado:
-- cliente sem linha = tudo liberado. A migration só adiciona; nada existente é alterado.

create table public.rotina_ajustes (
  id                   smallint primary key default 1 check (id = 1),
  ativa                boolean  not null default true,
  limite_ajustes       smallint not null default 10 check (limite_ajustes between 1 and 20),
  meta_minima          smallint not null default 4  check (meta_minima between 0 and 20),
  max_postagens        smallint not null default 4  check (max_postagens between 0 and 16),
  responder_avaliacoes boolean  not null default true,
  publicar_postagens   boolean  not null default true,
  enviar_fotos         boolean  not null default true,
  atualizar_servicos   boolean  not null default true,
  atualizado_em        timestamptz not null default now(),
  atualizado_por       text,
  check (meta_minima <= limite_ajustes)
);
insert into public.rotina_ajustes (id) values (1);

create table public.rotina_clientes (
  cliente_id     uuid primary key references public.clientes (id) on delete cascade,
  pausada        boolean not null default false,
  fotos          boolean not null default true,
  servicos       boolean not null default true,
  postagens      boolean not null default true,
  respostas      boolean not null default true,
  nota           text    not null default '' check (length(nota) <= 300),
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);

create trigger rotina_ajustes_carimbar before update on public.rotina_ajustes
  for each row execute function private.carimbar();
create trigger rotina_clientes_carimbar before update on public.rotina_clientes
  for each row execute function private.carimbar();

alter table public.rotina_ajustes  enable row level security;
alter table public.rotina_clientes enable row level security;

-- Ajustes gerais: toda a equipe lê, só o administrador muda
create policy rotina_ajustes_ler  on public.rotina_ajustes for select to authenticated using ((select private.eh_equipe()));
create policy rotina_ajustes_mudar on public.rotina_ajustes for update to authenticated
  using ((select private.eh_admin())) with check ((select private.eh_admin()));

-- Ajustes por cliente: quem edita pode mudar
create policy rotina_clientes_ler    on public.rotina_clientes for select to authenticated using ((select private.eh_equipe()));
create policy rotina_clientes_criar  on public.rotina_clientes for insert to authenticated with check ((select private.pode_editar()));
create policy rotina_clientes_mudar  on public.rotina_clientes for update to authenticated
  using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy rotina_clientes_apagar on public.rotina_clientes for delete to authenticated using ((select private.pode_editar()));
