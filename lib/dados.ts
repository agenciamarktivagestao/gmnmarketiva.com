import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { modoDemonstracao } from "./ambiente";
import { supabaseServidor } from "./supabase";
import type { Cliente, Diagnostico, Evento, Membro, Pendencia, Usuario } from "./tipos";

// ---------------------------------------------------------------------------
// Modo demonstração: dados da leitura de 16/11/2026, só em memória
// ---------------------------------------------------------------------------
const DEMO_EM = "2026-11-16T21:00:00Z";

type Seed = {
  lido_em: string;
  clientes: Omit<Cliente, "id">[];
  diagnosticos: { slug: string; impressoes: number; ligacoes: number; rotas: number; cliques_site: number; campos: Diagnostico["campos"] }[];
  pendencias: { slug: string | null; titulo: string; detalhe: string; prioridade: string; quem: string }[];
};

// Só é lido no modo demonstração; com o Supabase conectado o arquivo nem precisa existir.
const lerSeed = cache((): Seed => JSON.parse(readFileSync(path.join(process.cwd(), "data", "seed.json"), "utf8")));

function demoClientes(): Cliente[] {
  return lerSeed().clientes.map((c) => ({ ...c, id: `c-${c.slug}` }));
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

export async function listarClientes(): Promise<Cliente[]> {
  if (modoDemonstracao()) return demoClientes();
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("clientes")
    .select("id,slug,nome,categoria,cidade,gbp_location,ordem")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new Error(error.message);
  return data ?? [];
}

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
      "id,cliente_id,titulo,detalhe,prioridade,quem,status,origem,decidido_por,decidido_em,criado_em,comentarios(id,pendencia_id,autor,texto,criado_em)",
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
