-- Marktiva · Link de acompanhamento do cliente (somente leitura).
-- Cada cliente pode ter 1 link secreto ativo. Quem tem o link vê a semana daquele cliente e mais nada:
-- a página pública não lê tabelas, só chama public.acompanhamento_cliente(token), que devolve campos escolhidos.
-- Nada fica público até um administrador criar o link. A migration só adiciona; nada existente é alterado.

create table public.acessos_cliente (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  token          text not null unique check (length(token) between 32 and 128),
  criado_em      timestamptz not null default now(),
  criado_por     text,
  revogado_em    timestamptz,
  revogado_por   text,
  acessos        integer not null default 0,
  ultimo_acesso  timestamptz
);

-- No máximo um link ativo por cliente (os desativados ficam guardados, só para consulta)
create unique index acessos_cliente_um_ativo on public.acessos_cliente (cliente_id) where revogado_em is null;

alter table public.acessos_cliente enable row level security;

-- O token é um segredo: só administrador lê, cria ou desativa. Ninguém apaga linhas.
create policy acessos_cliente_ler    on public.acessos_cliente for select to authenticated using ((select private.eh_admin()));
create policy acessos_cliente_criar  on public.acessos_cliente for insert to authenticated with check ((select private.eh_admin()));
create policy acessos_cliente_mudar  on public.acessos_cliente for update to authenticated
  using ((select private.eh_admin())) with check ((select private.eh_admin()));

-- Cria o link novo e desativa o anterior numa operação só: se algo falhar, o link antigo continua valendo.
-- É SECURITY INVOKER: as regras de acesso acima valem aqui também (quem não é administrador recebe erro).
create or replace function public.criar_link_cliente(p_cliente uuid, p_token text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  quem text := (select auth.jwt() ->> 'email');
begin
  update public.acessos_cliente
     set revogado_em = now(), revogado_por = quem
   where cliente_id = p_cliente and revogado_em is null;
  insert into public.acessos_cliente (cliente_id, token, criado_por) values (p_cliente, p_token, quem);
end;
$$;

revoke all on function public.criar_link_cliente(uuid, text) from public, anon;
grant execute on function public.criar_link_cliente(uuid, text) to authenticated;

-- A única porta pública. Recebe o token e devolve só o que o cliente pode ver:
--  · nome, categoria e cidade do cliente;
--  · as ações dos últimos dias que deram certo, sem decisões internas, análises nem anotações, e sem o campo "detalhe";
--  · os números do perfil no Google (aparições, ligações, rotas, cliques no site).
-- Token inexistente, desativado ou fora do formato devolve null, sem dizer o motivo.
-- p_contar = false é usado na pré-visualização da equipe, para não contar como "o cliente abriu".
create or replace function public.acompanhamento_cliente(p_token text, p_contar boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acesso_id uuid;
  cid uuid;
  resultado jsonb;
begin
  if p_token is null or length(p_token) not between 32 and 128 then
    return null;
  end if;

  select a.id, a.cliente_id into acesso_id, cid
    from public.acessos_cliente a
   where a.token = p_token and a.revogado_em is null;
  if not found then
    return null;
  end if;

  if p_contar then
    update public.acessos_cliente set acessos = acessos + 1, ultimo_acesso = now() where id = acesso_id;
  end if;

  select jsonb_build_object(
    'gerado_em', now(),
    'cliente', jsonb_build_object('nome', c.nome, 'categoria', c.categoria, 'cidade', c.cidade),
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'tipo', h.tipo, 'resumo', h.resumo, 'ocorreu_em', h.ocorreu_em)
                       order by h.ocorreu_em desc)
        from public.historico h
       where h.cliente_id = c.id
         and h.ok
         and h.tipo not in ('decisao', 'analise', 'outro')
         and h.ocorreu_em >= now() - interval '9 days'
    ), '[]'::jsonb),
    'diagnostico', (
      select jsonb_build_object('lido_em', d.lido_em, 'impressoes', d.impressoes, 'ligacoes', d.ligacoes,
                                'rotas', d.rotas, 'cliques_site', d.cliques_site)
        from public.diagnosticos d
       where d.cliente_id = c.id
       order by d.lido_em desc, d.criado_em desc
       limit 1
    )
  )
  into resultado
  from public.clientes c
  where c.id = cid and c.ativo;

  return resultado;
end;
$$;

-- Só o papel anônimo chama esta função: a página pública consulta o banco sem login. O Supabase avisa sobre isso
-- ("anon pode executar SECURITY DEFINER"); é intencional, é a única porta aberta e ela só entrega o que está acima.
revoke all on function public.acompanhamento_cliente(text, boolean) from public, authenticated;
grant execute on function public.acompanhamento_cliente(text, boolean) to anon;
