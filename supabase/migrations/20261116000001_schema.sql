-- Marktiva · Perfis: estrutura do banco
-- Quem acessa: só e-mails da tabela `equipe`. Qualquer outra conta criada no Supabase Auth não vê nada.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Equipe
-- ---------------------------------------------------------------------------
create table public.equipe (
  email      text primary key,
  nome       text,
  papel      text not null default 'editor' check (papel in ('admin', 'editor', 'leitura')),
  criado_em  timestamptz not null default now(),
  constraint equipe_email_minusculo check (email = lower(email))
);

create or replace function public.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.equipe e
    where e.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.pode_editar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.equipe e
    where e.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and e.papel in ('admin', 'editor')
  );
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.equipe e
    where e.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and e.papel = 'admin'
  );
$$;

revoke all on function public.eh_equipe() from public, anon;
revoke all on function public.pode_editar() from public, anon;
revoke all on function public.eh_admin() from public, anon;
grant execute on function public.eh_equipe() to authenticated;
grant execute on function public.pode_editar() to authenticated;
grant execute on function public.eh_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Clientes (um registro por perfil do Google Meu Negócio)
-- ---------------------------------------------------------------------------
create table public.clientes (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  nome             text not null,
  categoria        text,
  cidade           text,
  gbp_location     text unique,   -- ex.: locations/4862942198724333916
  drive_folder_id  text,          -- pasta de fotos no Google Drive
  ativo            boolean not null default true,
  ordem            integer not null default 0,
  criado_em        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Diagnóstico: retrato do perfil em uma data (campos em jsonb: {valor, nivel})
-- nivel: ok | rever | falta
-- ---------------------------------------------------------------------------
create table public.diagnosticos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes (id) on delete cascade,
  lido_em       date not null,
  fonte         text,
  impressoes    integer not null default 0,
  ligacoes      integer not null default 0,
  rotas         integer not null default 0,
  cliques_site  integer not null default 0,
  campos        jsonb not null default '{}'::jsonb,
  criado_em     timestamptz not null default now(),
  unique (cliente_id, lido_em)
);
create index diagnosticos_cliente_idx on public.diagnosticos (cliente_id, lido_em desc);

-- ---------------------------------------------------------------------------
-- Pendências
-- quem:   eu (a rotina resolve) | voce (depende da equipe ou do cliente) | bloq (só pelo Chrome ou plano pago)
-- status: aberta | aprovada (a rotina pode executar) | recusada | concluida
-- cliente_id nulo = vale para todos os perfis
-- ---------------------------------------------------------------------------
create table public.pendencias (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid references public.clientes (id) on delete cascade,
  titulo        text not null,
  detalhe       text,
  prioridade    text not null default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  quem          text not null default 'voce' check (quem in ('eu', 'voce', 'bloq')),
  status        text not null default 'aberta' check (status in ('aberta', 'aprovada', 'recusada', 'concluida')),
  origem        text not null default 'analise' check (origem in ('analise', 'rotina', 'equipe')),
  decidido_por  text,
  decidido_em   timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index pendencias_cliente_idx on public.pendencias (cliente_id);
create index pendencias_status_idx on public.pendencias (status, prioridade);

create table public.comentarios (
  id            uuid primary key default gen_random_uuid(),
  pendencia_id  uuid not null references public.pendencias (id) on delete cascade,
  autor         text not null,
  texto         text not null check (length(btrim(texto)) > 0),
  criado_em     timestamptz not null default now()
);
create index comentarios_pendencia_idx on public.comentarios (pendencia_id, criado_em);

-- ---------------------------------------------------------------------------
-- Execuções da rotina e histórico do que foi feito
-- ---------------------------------------------------------------------------
create table public.execucoes (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null default 'diaria' check (tipo in ('diaria', 'quarta_sexta', 'manual')),
  iniciada_em  timestamptz not null default now(),
  resumo       text
);

create table public.historico (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid references public.clientes (id) on delete set null,
  execucao_id  uuid references public.execucoes (id) on delete set null,
  tipo         text not null default 'outro'
               check (tipo in ('foto', 'servico', 'categoria', 'resposta', 'post', 'area', 'descricao', 'analise', 'decisao', 'outro')),
  resumo       text not null,
  detalhe      text,
  origem       text not null default 'rotina' check (origem in ('rotina', 'equipe', 'analise')),
  ok           boolean not null default true,
  ocorreu_em   timestamptz not null default now()
);
create index historico_ocorreu_idx on public.historico (ocorreu_em desc);
create index historico_cliente_idx on public.historico (cliente_id, ocorreu_em desc);
create index historico_execucao_idx on public.historico (execucao_id);

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------
create or replace function public.pendencias_ao_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  if new.status is distinct from old.status then
    new.decidido_em := now();
    if new.status in ('aprovada', 'recusada', 'aberta') then
      new.decidido_por := coalesce(auth.jwt() ->> 'email', new.decidido_por);
      insert into public.historico (cliente_id, tipo, resumo, origem)
      values (
        new.cliente_id,
        'decisao',
        case new.status
          when 'aprovada' then 'Aprovada: '
          when 'recusada' then 'Recusada: '
          else 'Reaberta: '
        end || new.titulo,
        'equipe'
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger pendencias_atualizar
  before update on public.pendencias
  for each row execute function public.pendencias_ao_atualizar();

-- ---------------------------------------------------------------------------
-- Segurança por linha
-- ---------------------------------------------------------------------------
alter table public.equipe        enable row level security;
alter table public.clientes      enable row level security;
alter table public.diagnosticos  enable row level security;
alter table public.pendencias    enable row level security;
alter table public.comentarios   enable row level security;
alter table public.execucoes     enable row level security;
alter table public.historico     enable row level security;

-- equipe: todos da equipe leem; só admin altera
create policy equipe_ler    on public.equipe for select to authenticated using ((select public.eh_equipe()));
create policy equipe_criar  on public.equipe for insert to authenticated with check ((select public.eh_admin()));
create policy equipe_mudar  on public.equipe for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy equipe_apagar on public.equipe for delete to authenticated using ((select public.eh_admin()));

-- clientes, diagnosticos, execucoes: equipe lê, editor e admin gravam
create policy clientes_ler    on public.clientes for select to authenticated using ((select public.eh_equipe()));
create policy clientes_criar  on public.clientes for insert to authenticated with check ((select public.pode_editar()));
create policy clientes_mudar  on public.clientes for update to authenticated using ((select public.pode_editar())) with check ((select public.pode_editar()));
create policy clientes_apagar on public.clientes for delete to authenticated using ((select public.eh_admin()));

create policy diagnosticos_ler    on public.diagnosticos for select to authenticated using ((select public.eh_equipe()));
create policy diagnosticos_criar  on public.diagnosticos for insert to authenticated with check ((select public.pode_editar()));
create policy diagnosticos_mudar  on public.diagnosticos for update to authenticated using ((select public.pode_editar())) with check ((select public.pode_editar()));
create policy diagnosticos_apagar on public.diagnosticos for delete to authenticated using ((select public.eh_admin()));

create policy execucoes_ler    on public.execucoes for select to authenticated using ((select public.eh_equipe()));
create policy execucoes_criar  on public.execucoes for insert to authenticated with check ((select public.pode_editar()));
create policy execucoes_mudar  on public.execucoes for update to authenticated using ((select public.pode_editar())) with check ((select public.pode_editar()));
create policy execucoes_apagar on public.execucoes for delete to authenticated using ((select public.eh_admin()));

-- pendencias, comentarios, historico: equipe lê, editor e admin gravam
create policy pendencias_ler    on public.pendencias for select to authenticated using ((select public.eh_equipe()));
create policy pendencias_criar  on public.pendencias for insert to authenticated with check ((select public.pode_editar()));
create policy pendencias_mudar  on public.pendencias for update to authenticated using ((select public.pode_editar())) with check ((select public.pode_editar()));
create policy pendencias_apagar on public.pendencias for delete to authenticated using ((select public.eh_admin()));

create policy comentarios_ler    on public.comentarios for select to authenticated using ((select public.eh_equipe()));
create policy comentarios_criar  on public.comentarios for insert to authenticated with check ((select public.pode_editar()));
create policy comentarios_apagar on public.comentarios for delete to authenticated using ((select public.eh_admin()));

create policy historico_ler    on public.historico for select to authenticated using ((select public.eh_equipe()));
create policy historico_criar  on public.historico for insert to authenticated with check ((select public.pode_editar()));
create policy historico_apagar on public.historico for delete to authenticated using ((select public.eh_admin()));

-- Sem acesso para visitantes não autenticados
revoke all on all tables in schema public from anon;

-- Primeiro administrador
insert into public.equipe (email, nome, papel)
values ('agenciamarktiva.gestao@gmail.com', 'Agência Marktiva', 'admin');
