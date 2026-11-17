-- Marktiva · Perfis: ideia principal e tom de cada cliente, serviços, imagens e conteúdo para aprovar

-- ---------------------------------------------------------------------------
-- Carimbo de atualização
-- ---------------------------------------------------------------------------
create or replace function private.carimbar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := coalesce(auth.jwt() ->> 'email', new.atualizado_por);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Diretrizes: a ideia principal e o tom de voz.
-- cliente_id nulo = diretriz geral, que vale para todo o sistema.
-- aprovacao: automatica = a rotina publica; manual = a rotina só deixa rascunho para a equipe aprovar.
-- ---------------------------------------------------------------------------
create table public.diretrizes (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid unique references public.clientes (id) on delete cascade,
  ideia_principal  text not null default '',
  tom              text not null default '',
  tratamento       text not null default 'voce' check (tratamento in ('voce', 'senhor', 'neutro')),
  emojis           text not null default 'nenhum' check (emojis in ('nenhum', 'poucos', 'livre')),
  assinatura       text not null default '',
  usar             text not null default '',
  evitar           text not null default '',
  exemplo_resposta text not null default '',
  exemplo_postagem text not null default '',
  aprovacao        text not null default 'automatica' check (aprovacao in ('automatica', 'manual')),
  revisado         boolean not null default false,
  atualizado_em    timestamptz not null default now(),
  atualizado_por   text
);
create unique index diretrizes_geral_unica on public.diretrizes ((true)) where cliente_id is null;
create trigger diretrizes_carimbar before update on public.diretrizes
  for each row execute function private.carimbar();

-- ---------------------------------------------------------------------------
-- Serviços de cada perfil
-- status: no_perfil (já está no Google) | sugerido (espera decisão) | aprovado (a rotina coloca no perfil) | recusado
-- ---------------------------------------------------------------------------
alter table public.clientes add column servicos_padrao integer not null default 0;

create table public.servicos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  nome           text not null check (length(btrim(nome)) > 0),
  descricao      text not null default '' check (length(descricao) <= 300),
  categoria_gbp  text,
  status         text not null default 'sugerido' check (status in ('no_perfil', 'sugerido', 'aprovado', 'recusado')),
  origem         text not null default 'equipe' check (origem in ('perfil', 'rotina', 'equipe')),
  decidido_por   text,
  decidido_em    timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);
create index servicos_cliente_idx on public.servicos (cliente_id, status);

-- ---------------------------------------------------------------------------
-- Imagens para subir nos perfis
-- Ficam no armazenamento do Supabase (bucket "midias"). A rotina envia ao Google pelo endereço público.
-- status: na_fila (a rotina envia) | enviada | cancelada
-- ---------------------------------------------------------------------------
create table public.midias (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  caminho        text not null unique,
  url            text not null,
  nome_original  text,
  largura        integer,
  altura         integer,
  bytes          integer,
  categoria      text not null default 'ADDITIONAL' check (categoria in ('ADDITIONAL', 'COVER', 'PROFILE')),
  nota           text,
  status         text not null default 'na_fila' check (status in ('na_fila', 'enviada', 'cancelada')),
  enviada_em     timestamptz,
  criado_por     text,
  criado_em      timestamptz not null default now()
);
create index midias_cliente_idx on public.midias (cliente_id, status);

-- ---------------------------------------------------------------------------
-- Conteúdo: postagens e respostas a avaliações, com prévia antes de ir ao Google
-- status: rascunho (espera decisão) | aprovado (a rotina publica) | publicado | recusado
-- ---------------------------------------------------------------------------
create table public.conteudos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  tipo           text not null check (tipo in ('postagem', 'resposta')),
  avaliador      text,
  estrelas       integer check (estrelas between 1 and 5),
  avaliacao      text,
  review_id      text,
  texto          text not null check (length(btrim(texto)) > 0),
  midia_id       uuid references public.midias (id) on delete set null,
  status         text not null default 'rascunho' check (status in ('rascunho', 'aprovado', 'publicado', 'recusado')),
  origem         text not null default 'equipe' check (origem in ('rotina', 'equipe')),
  decidido_por   text,
  decidido_em    timestamptz,
  publicado_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);
create index conteudos_cliente_idx on public.conteudos (cliente_id, status);
create index conteudos_status_idx on public.conteudos (status, criado_em desc);

-- ---------------------------------------------------------------------------
-- Gatilhos: carimbo e registro das decisões no histórico
-- ---------------------------------------------------------------------------
create or replace function private.servicos_ao_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := coalesce(auth.jwt() ->> 'email', new.atualizado_por);
  if new.status is distinct from old.status and new.status in ('aprovado', 'recusado') then
    new.decidido_em := now();
    new.decidido_por := coalesce(auth.jwt() ->> 'email', new.decidido_por);
    insert into public.historico (cliente_id, tipo, resumo, origem)
    values (new.cliente_id, 'decisao',
            case new.status when 'aprovado' then 'Serviço aprovado: ' else 'Serviço recusado: ' end || new.nome,
            'equipe');
  end if;
  return new;
end;
$$;
create trigger servicos_atualizar before update on public.servicos
  for each row execute function private.servicos_ao_atualizar();

create or replace function private.conteudos_ao_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := coalesce(auth.jwt() ->> 'email', new.atualizado_por);
  if new.status is distinct from old.status and new.status in ('aprovado', 'recusado') then
    new.decidido_em := now();
    new.decidido_por := coalesce(auth.jwt() ->> 'email', new.decidido_por);
    insert into public.historico (cliente_id, tipo, resumo, origem)
    values (new.cliente_id,
            case new.tipo when 'postagem' then 'post' else 'resposta' end,
            case new.status when 'aprovado' then 'Aprovada: ' else 'Recusada: ' end
              || case new.tipo when 'postagem' then 'postagem' else 'resposta a avaliação' end,
            'equipe');
  end if;
  return new;
end;
$$;
create trigger conteudos_atualizar before update on public.conteudos
  for each row execute function private.conteudos_ao_atualizar();

-- ---------------------------------------------------------------------------
-- Segurança por linha: equipe lê; editor e admin gravam
-- ---------------------------------------------------------------------------
alter table public.diretrizes enable row level security;
alter table public.servicos   enable row level security;
alter table public.midias     enable row level security;
alter table public.conteudos  enable row level security;

create policy diretrizes_ler    on public.diretrizes for select to authenticated using ((select private.eh_equipe()));
create policy diretrizes_criar  on public.diretrizes for insert to authenticated with check ((select private.pode_editar()));
create policy diretrizes_mudar  on public.diretrizes for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy diretrizes_apagar on public.diretrizes for delete to authenticated using ((select private.eh_admin()));

create policy servicos_ler    on public.servicos for select to authenticated using ((select private.eh_equipe()));
create policy servicos_criar  on public.servicos for insert to authenticated with check ((select private.pode_editar()));
create policy servicos_mudar  on public.servicos for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy servicos_apagar on public.servicos for delete to authenticated using ((select private.pode_editar()));

create policy midias_ler    on public.midias for select to authenticated using ((select private.eh_equipe()));
create policy midias_criar  on public.midias for insert to authenticated with check ((select private.pode_editar()));
create policy midias_mudar  on public.midias for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy midias_apagar on public.midias for delete to authenticated using ((select private.pode_editar()));

create policy conteudos_ler    on public.conteudos for select to authenticated using ((select private.eh_equipe()));
create policy conteudos_criar  on public.conteudos for insert to authenticated with check ((select private.pode_editar()));
create policy conteudos_mudar  on public.conteudos for update to authenticated using ((select private.pode_editar())) with check ((select private.pode_editar()));
create policy conteudos_apagar on public.conteudos for delete to authenticated using ((select private.pode_editar()));

revoke all on public.diretrizes, public.servicos, public.midias, public.conteudos from anon;

-- ---------------------------------------------------------------------------
-- Armazenamento das imagens. As fotos vão para os perfis públicos do Google, então o endereço é público
-- (nomes não adivinháveis); só a equipe lista, envia e apaga.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midias', 'midias', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy midias_arquivos_ver     on storage.objects for select to authenticated
  using (bucket_id = 'midias' and (select private.eh_equipe()));
create policy midias_arquivos_enviar  on storage.objects for insert to authenticated
  with check (bucket_id = 'midias' and (select private.pode_editar()));
create policy midias_arquivos_apagar  on storage.objects for delete to authenticated
  using (bucket_id = 'midias' and (select private.pode_editar()));
