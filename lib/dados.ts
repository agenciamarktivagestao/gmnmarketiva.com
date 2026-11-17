import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { modoDemonstracao } from "./ambiente";
import { kindDemonstracao } from "./kinds";
import { normalizarPerfil } from "./perfil";
import type { PerfilLido } from "./perfil";
import { perfilDemonstracao } from "./perfil-demo";
import { supabaseServidor } from "./supabase";
import type { Cliente, Conteudo, Diagnostico, Diretriz, Evento, Membro, Midia, Pendencia, Servico, Usuario } from "./tipos";

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

export async function listarEquipe(): Promise<Membro[]> {
  if (modoDemonstracao()) return [{ email: "demonstracao@marktiva", nome: "Modo demonstração", papel: "admin" }];
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("equipe").select("email,nome,papel").order("criado_em");
  if (error) throw new Error(error.message);
  return (data as Membro[]) ?? [];
}

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
