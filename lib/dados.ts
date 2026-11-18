import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { modoDemonstracao } from "./ambiente";
import { eventosDemonstracao } from "./historico-demo";
import { kindDemonstracao } from "./kinds";
import { normalizarMudancas } from "./mudancas";
import { normalizarPerfil } from "./perfil";
import { AJUSTES_PADRAO, normalizarAjustes } from "./rotina";
import type { PerfilLido } from "./perfil";
import { perfilDemonstracao } from "./perfil-demo";
import { TOKEN_DEMO, lerRespostaPublica } from "./acompanhamento";
import type { Acompanhamento, LinkDoCliente } from "./acompanhamento";
import { paraOCliente } from "./semana";
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
    .select("id,cliente_id,tipo,resumo,detalhe,origem,ok,ocorreu_em")
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
      .select("id,cliente_id,tipo,resumo,detalhe,origem,ok,ocorreu_em")
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
