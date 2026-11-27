import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { modoDemonstracao } from "./ambiente";
import { desempenhoDemonstracao, reputacaoDemonstracao, termosDemonstracao } from "./desempenho-demo";
import { somarDiasNaData } from "./desempenho";
import type { DiaDoCliente, Reputacao, TermoBusca } from "./desempenho";
import { eventosDemonstracao } from "./historico-demo";
import { kindDemonstracao } from "./kinds";
import { normalizarMudancas } from "./mudancas";
import { normalizarPerfil } from "./perfil";
import { lerPosicoes } from "./ranking";
import type { Medicao } from "./ranking";
import { rankingDemonstracao } from "./ranking-demo";
import { AJUSTES_PADRAO, normalizarAjustes } from "./rotina";
import type { PerfilLido } from "./perfil";
import { perfilDemonstracao } from "./perfil-demo";
import { TOKEN_DEMO, lerRespostaPublica } from "./acompanhamento";
import type { Acompanhamento, LinkDoCliente } from "./acompanhamento";
import { alertasDeDemonstracao } from "./avaliacoes-ruins-demo";
import type { AlertaAvaliacao } from "./avaliacoes-ruins";
import { diaChave, paraOCliente } from "./semana";
import { supabasePublico, supabaseServidor } from "./supabase";
import type {
  AjustesCliente,
  AjustesRotina,
  Cliente,
  Conteudo,
  Diagnostico,
  Diretriz,
  Evento,
  Execucao,
  Membro,
  Midia,
  Mudanca,
  Pendencia,
  Servico,
  Usuario,
} from "./tipos";

// ---------------------------------------------------------------------------
// Modo demonstração: dados da leitura de 16/11/2026, só em memória
// ---------------------------------------------------------------------------
const DEMO_EM = "2026-11-16T21:00:00Z";

type Seed = {
  lido_em: string;
  clientes: Omit<Cliente, "id" | "servicos_padrao">[];
  diagnosticos: { slug: string; impressoes: number; ligacoes: number; rotas: number; cliques_site: number; campos: Diagnostico["campos"] }[];
  pendencias: { slug: string | null; titulo: string; detalhe: string; prioridade: string; quem: string }[];
};

// Só é lido no modo demonstração; com o Supabase conectado o arquivo nem precisa existir.
const lerSeed = cache((): Seed => JSON.parse(readFileSync(path.join(process.cwd(), "data", "seed.json"), "utf8")));

function demoClientes(): Cliente[] {
  return lerSeed().clientes.map((c) => ({ ...c, servicos_padrao: 0, id: `c-${c.slug}` }));
}
function demoDiagnosticos(): Diagnostico[] {
  return lerSeed().diagnosticos.map((d) => ({
    cliente_id: `c-${d.slug}`,
    lido_em: lerSeed().lido_em,
    impressoes: d.impressoes,
    ligacoes: d.ligacoes,
    rotas: d.rotas,
    cliques_site: d.cliques_site,
    campos: d.campos,
  }));
}
function demoPendencias(): Pendencia[] {
  return lerSeed().pendencias.map((p, i) => ({
    ...kindDemonstracao(p.titulo, p.quem, p.slug),
    id: `p-${i + 1}`,
    cliente_id: p.slug ? `c-${p.slug}` : null,
    titulo: p.titulo,
    detalhe: p.detalhe,
    prioridade: p.prioridade as Pendencia["prioridade"],
    quem: p.quem as Pendencia["quem"],
    status: "aberta",
    origem: "analise",
    decidido_por: null,
    decidido_em: null,
    criado_em: new Date(Date.parse(DEMO_EM) + i * 1000).toISOString(),
    comentarios: [],
  }));
}
function demoHistorico(): Evento[] {
  return [
    {
      id: "h-1",
      cliente_id: null,
      tipo: "analise",
      resumo: "Análise dos 15 perfis",
      detalhe: "Leitura do Windsor e do Drive em 16/11/2026: categorias, serviços, mídia, avaliações, postagens e desempenho dos últimos 30 dias.",
      origem: "analise",
      ok: true,
      ocorreu_em: "2026-11-16T21:00:00Z",
      conferido_em: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Leituras
// ---------------------------------------------------------------------------
export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  if (modoDemonstracao()) return { email: "demonstracao@marktiva", papel: "editor" };
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  if (!data.user?.email) return null;
  const email = data.user.email.toLowerCase();
  const { data: membro } = await sb.from("equipe").select("papel").eq("email", email).maybeSingle();
  return { email, papel: (membro?.papel as Usuario["papel"]) ?? null };
});

export const listarClientes = cache(async (): Promise<Cliente[]> => {
  if (modoDemonstracao()) return demoClientes();
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("clientes")
    .select("id,slug,nome,categoria,cidade,gbp_location,servicos_padrao,ordem")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new Error(error.message);
  return data ?? [];
});

// Último diagnóstico de cada cliente
export async function listarDiagnosticos(): Promise<Map<string, Diagnostico>> {
  const mapa = new Map<string, Diagnostico>();
  if (modoDemonstracao()) {
    demoDiagnosticos().forEach((d) => mapa.set(d.cliente_id, d));
    return mapa;
  }
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("diagnosticos")
    .select("cliente_id,lido_em,impressoes,ligacoes,rotas,cliques_site,campos")
    .order("lido_em", { ascending: false });
  if (error) throw new Error(error.message);
  (data as Diagnostico[]).forEach((d) => {
    if (!mapa.has(d.cliente_id)) mapa.set(d.cliente_id, d);
  });
  return mapa;
}

export async function listarPendencias(): Promise<Pendencia[]> {
  if (modoDemonstracao()) return demoPendencias();
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("pendencias")
    .select(
      "id,cliente_id,titulo,detalhe,prioridade,quem,status,origem,kind,payload,resposta,decidido_por,decidido_em,criado_em,comentarios(id,pendencia_id,autor,texto,criado_em)",
    )
    .order("criado_em");
  if (error) throw new Error(error.message);
  return (data as Pendencia[]).map((p) => ({
    ...p,
    comentarios: [...(p.comentarios ?? [])].sort((a, b) => a.criado_em.localeCompare(b.criado_em)),
  }));
}

export async function listarHistorico(limite = 300): Promise<Evento[]> {
  if (modoDemonstracao()) return demoHistorico();
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("historico")
    .select("id,cliente_id,tipo,resumo,detalhe,origem,ok,ocorreu_em,conferido_em")
    .order("ocorreu_em", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Tudo o que foi registrado desde uma data (para a visão "Últimos 7 dias"). É um complemento:
// se a leitura falhar, as páginas continuam e mostram a semana vazia em vez de quebrar.
export const listarEventosDesde = cache(async (desdeISO: string, limite = 3000): Promise<Evento[]> => {
  if (modoDemonstracao()) return eventosDemonstracao(new Date()).filter((e) => e.ocorreu_em >= desdeISO);
  try {
    const sb = await supabaseServidor();
    const { data, error } = await sb
      .from("historico")
      .select("id,cliente_id,tipo,resumo,detalhe,origem,ok,ocorreu_em,conferido_em")
      .gte("ocorreu_em", desdeISO)
      .order("ocorreu_em", { ascending: false })
      .limit(limite);
    if (error) throw new Error(error.message);
    return data ?? [];
  } catch (e) {
    console.error("historico da semana:", e instanceof Error ? e.message : e);
    return [];
  }
});

// ---------------------------------------------------------------------------
// Desempenho dos perfis (números diários, termos de busca e avaliações que a rotina grava a partir do Windsor)
// ---------------------------------------------------------------------------
const TAMANHO_DA_PAGINA = 1000; // o limite de linhas por consulta do Supabase

type Pagina<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function lerEmPaginas<T>(consulta: (de: number, ate: number) => Pagina<T>): Promise<T[]> {
  const tudo: T[] = [];
  for (let de = 0; ; de += TAMANHO_DA_PAGINA) {
    const { data, error } = await consulta(de, de + TAMANHO_DA_PAGINA - 1);
    if (error) throw new Error(error.message);
    tudo.push(...(data ?? []));
    if (!data || data.length < TAMANHO_DA_PAGINA) return tudo;
  }
}

// Na demonstração, o último dia com número é três dias antes de hoje (o Google fecha cada dia com esse atraso),
// do mesmo jeito que as ações de demonstração do histórico: assim os dois se encontram na tela
const demoUltimoDiaDesempenho = () => somarDiasNaData(diaChave(new Date()), -3);
const demoIdDoCliente = (slug: string) => `c-${slug}`;

// Números por dia de todos os clientes (ou de um só) a partir de `desdeDia`, do mais antigo para o mais novo
export const listarDesempenho = cache(async (desdeDia: string, clienteId?: string): Promise<DiaDoCliente[]> => {
  if (modoDemonstracao()) {
    return desempenhoDemonstracao(lerSeed().diagnosticos, demoIdDoCliente, demoUltimoDiaDesempenho())
      .filter((d) => d.dia >= desdeDia && (!clienteId || d.cliente_id === clienteId))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  }
  const sb = await supabaseServidor();
  return lerEmPaginas<DiaDoCliente>((de, ate) => {
    const consulta = sb
      .from("desempenho_diario")
      .select("cliente_id,dia,maps_pc,busca_pc,maps_cel,busca_cel,ligacoes,cliques_site,rotas,reservas")
      .gte("dia", desdeDia)
      .order("dia")
      .order("cliente_id")
      .range(de, ate);
    return clienteId ? consulta.eq("cliente_id", clienteId) : consulta;
  });
});

// Termos que levaram as pessoas ao perfil, por mês
export const listarTermos = cache(async (clienteId: string): Promise<TermoBusca[]> => {
  if (modoDemonstracao()) return termosDemonstracao(demoIdDoCliente).filter((t) => t.cliente_id === clienteId);
  const sb = await supabaseServidor();
  return lerEmPaginas<TermoBusca>((de, ate) =>
    sb.from("desempenho_termos").select("cliente_id,mes,termo,usuarios,abaixo_de").eq("cliente_id", clienteId).order("mes", { ascending: false }).order("termo").range(de, ate),
  );
});

// Nota e total de avaliações lidos desde `desdeDia` (a tela usa a leitura mais recente de cada cliente)
export const listarReputacao = cache(async (desdeDia: string): Promise<Reputacao[]> => {
  if (modoDemonstracao()) return reputacaoDemonstracao(demoIdDoCliente, demoUltimoDiaDesempenho());
  const sb = await supabaseServidor();
  const linhas = await lerEmPaginas<{ cliente_id: string; dia: string; nota: number | string | null; total_avaliacoes: number | null }>((de, ate) =>
    sb.from("desempenho_reputacao").select("cliente_id,dia,nota,total_avaliacoes").gte("dia", desdeDia).order("dia").order("cliente_id").range(de, ate),
  );
  return linhas.map((r) => ({ ...r, nota: r.nota === null ? null : Number(r.nota) }));
});

// Ranking regional: as medições de posição no Google Maps (uma varredura a cada 15 dias), da mais antiga para a mais nova.
// Se a leitura falhar, a tela mostra o aviso de "ainda sem medição" em vez de derrubar a página inteira.
export const listarRanking = cache(async (desdeDia: string, clienteId?: string): Promise<Medicao[]> => {
  if (modoDemonstracao()) {
    return rankingDemonstracao(demoIdDoCliente, diaChave(new Date()))
      .filter((m) => m.dia >= desdeDia && (!clienteId || m.cliente_id === clienteId))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  }
  try {
    const sb = await supabaseServidor();
    const linhas = await lerEmPaginas<{ cliente_id: string; dia: string; palavra: string; grade: number; espacamento_km: number | string; posicoes: unknown; fonte: string }>((de, ate) => {
      const consulta = sb
        .from("desempenho_ranking")
        .select("cliente_id,dia,palavra,grade,espacamento_km,posicoes,fonte")
        .gte("dia", desdeDia)
        .order("dia")
        .order("cliente_id")
        .order("palavra")
        .range(de, ate);
      return clienteId ? consulta.eq("cliente_id", clienteId) : consulta;
    });
    return linhas.flatMap((l) => {
      const posicoes = lerPosicoes(l.posicoes, l.grade);
      return posicoes ? [{ cliente_id: l.cliente_id, dia: l.dia, palavra: l.palavra, grade: l.grade, espacamento_km: Number(l.espacamento_km), posicoes, fonte: l.fonte }] : [];
    });
  } catch (e) {
    console.error("ranking:", e instanceof Error ? e.message : e);
    return [];
  }
});

export async function listarEquipe(): Promise<Membro[]> {
  if (modoDemonstracao()) return [{ email: "demonstracao@marktiva", nome: "Modo demonstração", papel: "admin" }];
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("equipe").select("email,nome,papel").order("criado_em");
  if (error) throw new Error(error.message);
  return (data as Membro[]) ?? [];
}

// O registro de mudanças. No modo demonstração vem de data/mudancas.json; com o Supabase, da tabela mudancas_sistema.
export async function listarMudancas(): Promise<Mudanca[]> {
  if (modoDemonstracao()) return normalizarMudancas(JSON.parse(readFileSync(path.join(process.cwd(), "data", "mudancas.json"), "utf8")));
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("mudancas_sistema")
    .select("id,feito_em,titulo,resumo,itens,como_testar,pendente,tipo,commit_sha,autor")
    .order("feito_em", { ascending: false })
    .limit(200);
  if (error) {
    // O registro é um complemento: se falhar, o resto do painel continua
    console.error("mudancas_sistema:", error.message);
    return [];
  }
  return normalizarMudancas(data);
}

// Até quando esta pessoa já viu as novidades (null = nunca abriu)
export async function lerVistoAte(email: string): Promise<string | null> {
  if (modoDemonstracao()) return "2026-11-18T00:00:00Z"; // na demonstração nada aparece como novo
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("mudancas_vistas").select("visto_ate").eq("email", email).maybeSingle();
  if (error) {
    console.error("mudancas_vistas:", error.message);
    return "9999-12-31T00:00:00Z"; // se não der para ler, não mostra selo em vez de mostrar tudo como novo
  }
  return data?.visto_ate ?? null;
}

// Quantas novidades esta pessoa ainda não viu (para o selo do menu). Nunca derruba o layout.
export const contarNovidadesNaoVistas = cache(async (email: string): Promise<number> => {
  if (modoDemonstracao()) return 0;
  try {
    const sb = await supabaseServidor();
    const visto = await lerVistoAte(email);
    let consulta = sb.from("mudancas_sistema").select("id", { count: "exact", head: true });
    if (visto) consulta = consulta.gt("feito_em", visto);
    const { count, error } = await consulta;
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch (e) {
    console.error("novidades não vistas:", e instanceof Error ? e.message : e);
    return 0;
  }
});

// A última leitura do perfil do Google de um cliente (null = a rotina ainda não gravou)
export async function lerPerfil(cliente: Cliente, diagnostico?: Diagnostico): Promise<PerfilLido | null> {
  if (modoDemonstracao()) return perfilDemonstracao(cliente, diagnostico);
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("perfis_leitura").select("lido_em,dados").eq("cliente_id", cliente.id).maybeSingle();
  if (error) {
    // A prévia é um complemento: se a leitura falhar, a página continua com o resto
    console.error("perfis_leitura:", error.message);
    return null;
  }
  return data ? { lido_em: data.lido_em as string, dados: normalizarPerfil(data.dados) } : null;
}

// ---------------------------------------------------------------------------
// Diretrizes, serviços, imagens e conteúdo (só com o Supabase conectado)
// ---------------------------------------------------------------------------
export async function listarDiretrizes(): Promise<Diretriz[]> {
  if (modoDemonstracao()) return [];
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("diretrizes").select("*");
  if (error) throw new Error(error.message);
  return (data as Diretriz[]) ?? [];
}

export async function listarServicos(): Promise<Servico[]> {
  if (modoDemonstracao()) return [];
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("servicos")
    .select("id,cliente_id,nome,descricao,categoria_gbp,status,origem,decidido_por,decidido_em,atualizado_em")
    .order("criado_em")
    .order("nome");
  if (error) throw new Error(error.message);
  return (data as Servico[]) ?? [];
}

export async function listarMidias(): Promise<Midia[]> {
  if (modoDemonstracao()) return [];
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("midias")
    .select("id,cliente_id,caminho,url,nome_original,largura,altura,bytes,categoria,nota,status,enviada_em,criado_por,criado_em")
    .neq("status", "cancelada")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Midia[]) ?? [];
}

export async function listarConteudos(): Promise<Conteudo[]> {
  if (modoDemonstracao()) return [];
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("conteudos")
    .select("id,cliente_id,tipo,avaliador,estrelas,avaliacao,review_id,texto,midia_id,status,origem,decidido_por,decidido_em,publicado_em,criado_em")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Conteudo[]) ?? [];
}

// ---------------------------------------------------------------------------
// Alertas de avaliação ruim (a rotina grava; a equipe trata)
// ---------------------------------------------------------------------------
const COLUNAS_ALERTA =
  "id,cliente_id,review_id,avaliador,estrelas,texto,avaliada_em,motivo,motivo_detalhe,situacao,detectada_em,tratada_em,tratada_por,desfecho";

export async function listarAlertasAvaliacao(): Promise<AlertaAvaliacao[]> {
  if (modoDemonstracao()) return alertasDeDemonstracao(demoClientes().map((c) => c.id));
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("alertas_avaliacao").select(COLUNAS_ALERTA).order("detectada_em", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return (data as AlertaAvaliacao[]) ?? [];
}

// Só quantas esperam decisão (para o selo do menu): não pode derrubar a página se a tabela ainda não existir
export async function contarAlertasAvaliacao(): Promise<number> {
  if (modoDemonstracao()) return alertasDeDemonstracao(demoClientes().map((c) => c.id)).filter((a) => a.situacao === "nova").length;
  try {
    const sb = await supabaseServidor();
    const { count, error } = await sb.from("alertas_avaliacao").select("id", { count: "exact", head: true }).eq("situacao", "nova");
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Link de acompanhamento do cliente
// ---------------------------------------------------------------------------

// O link ativo de um cliente. Só administradores conseguem ler (o token é um segredo); para os outros vem null.
export async function lerLinkDoCliente(clienteId: string): Promise<LinkDoCliente | null> {
  if (modoDemonstracao()) {
    return { token: TOKEN_DEMO, criado_em: new Date(Date.now() - 3 * 86_400_000).toISOString(), acessos: 2, ultimo_acesso: new Date(Date.now() - 86_400_000).toISOString() };
  }
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("acessos_cliente")
    .select("token,criado_em,acessos,ultimo_acesso")
    .eq("cliente_id", clienteId)
    .is("revogado_em", null)
    .maybeSingle();
  if (error) {
    console.error("acessos_cliente:", error.message);
    return null;
  }
  return data as LinkDoCliente | null;
}

// O que a página pública mostra. Sem login: a pessoa só chega aqui com o token, e o banco só devolve os campos
// aprovados (ver a migration acessos_cliente). Token errado, desativado ou qualquer falha: null.
// contar = false na pré-visualização da equipe, para não contar como "o cliente abriu".
export async function lerAcompanhamento(token: string, contar = true): Promise<Acompanhamento | null> {
  if (modoDemonstracao()) return token === TOKEN_DEMO ? acompanhamentoDemonstracao() : null;
  try {
    const { data, error } = await supabasePublico().rpc("acompanhamento_cliente", { p_token: token, p_contar: contar });
    if (error) throw new Error(error.message);
    return lerRespostaPublica(data);
  } catch (e) {
    console.error("acompanhamento_cliente:", e instanceof Error ? e.message : e);
    return null;
  }
}

function acompanhamentoDemonstracao(): Acompanhamento | null {
  const cliente = demoClientes()[0];
  if (!cliente) return null;
  const d = demoDiagnosticos().find((x) => x.cliente_id === cliente.id);
  const eventos = paraOCliente(eventosDemonstracao(new Date()).filter((e) => e.cliente_id === cliente.id)).map((e) => ({ ...e, detalhe: null }));
  return {
    cliente: { nome: cliente.nome, categoria: cliente.categoria, cidade: cliente.cidade },
    eventos,
    diagnostico: d ? { lido_em: d.lido_em, impressoes: d.impressoes, ligacoes: d.ligacoes, rotas: d.rotas, cliques_site: d.cliques_site } : null,
    geradoEm: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Ajustes da rotina (tela Rotina)
// ---------------------------------------------------------------------------
export const lerAjustesRotina = cache(async (): Promise<AjustesRotina> => {
  if (modoDemonstracao()) return AJUSTES_PADRAO;
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("rotina_ajustes").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return normalizarAjustes(data);
});

export const listarAjustesClientes = cache(async (): Promise<AjustesCliente[]> => {
  if (modoDemonstracao()) return [];
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("rotina_clientes").select("cliente_id,pausada,fotos,servicos,postagens,respostas,nota");
  if (error) throw new Error(error.message);
  return (data as AjustesCliente[]) ?? [];
});

// As últimas rodadas da rotina. É um complemento: se a leitura falhar, a tela continua sem a lista.
export const listarExecucoes = cache(async (limite = 7): Promise<Execucao[]> => {
  if (modoDemonstracao()) return [];
  try {
    const sb = await supabaseServidor();
    const { data, error } = await sb.from("execucoes").select("id,tipo,iniciada_em,resumo").order("iniciada_em", { ascending: false }).limit(limite);
    if (error) throw new Error(error.message);
    return (data as Execucao[]) ?? [];
  } catch (e) {
    console.error("execucoes:", e instanceof Error ? e.message : e);
    return [];
  }
});
