"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { modoDemonstracao } from "@/lib/ambiente";
import { supabaseServidor } from "@/lib/supabase";
import type { Resultado } from "@/lib/acoes-tipos";

const DEMO: Resultado = { erro: "Modo demonstração: conecte o Supabase para salvar." };
const STATUS = ["aberta", "aprovada", "recusada", "concluida"] as const;
const PRIORIDADES = ["alta", "media", "baixa"] as const;
const QUEM = ["eu", "voce", "bloq"] as const;
const PAPEIS = ["admin", "editor", "leitura"] as const;

function atualizar() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Entrar e sair
// ---------------------------------------------------------------------------
export async function entrar(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha o e-mail e a senha." };
  const sb = await supabaseServidor();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) {
    return {
      erro: /confirm/i.test(error.message)
        ? "Confirme o e-mail pelo link que enviamos e tente de novo."
        : "E-mail ou senha incorretos.",
    };
  }
  redirect("/");
}

export async function criarAcesso(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  if (!email || senha.length < 8) return { erro: "Use um e-mail válido e uma senha de pelo menos 8 caracteres." };
  const origem = (await headers()).get("origin") ?? "";
  const sb = await supabaseServidor();
  const { data, error } = await sb.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: `${origem}/auth/confirm` },
  });
  if (error) return { erro: "Não foi possível criar o acesso: " + error.message };
  if (data.session) redirect("/");
  return { ok: true };
}

export async function sair() {
  if (!modoDemonstracao()) {
    const sb = await supabaseServidor();
    await sb.auth.signOut();
  }
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Pendências
// ---------------------------------------------------------------------------
export async function decidir(id: string, status: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  if (!(STATUS as readonly string[]).includes(status)) return { erro: "Status inválido." };
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("pendencias").update({ status }).eq("id", id).select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Sem permissão para alterar esta pendência." };
  atualizar();
  return { ok: true };
}

export async function comentar(id: string, texto: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva o comentário." };
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  const { error } = await sb
    .from("comentarios")
    .insert({ pendencia_id: id, texto: limpo.slice(0, 2000), autor: u.user?.email ?? "equipe" });
  if (error) return { erro: error.message };
  atualizar();
  return { ok: true };
}

export async function novaPendencia(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const titulo = String(dados.get("titulo") ?? "").trim();
  const detalhe = String(dados.get("detalhe") ?? "").trim();
  const cliente = String(dados.get("cliente_id") ?? "");
  const prioridade = String(dados.get("prioridade") ?? "media");
  const quem = String(dados.get("quem") ?? "eu");
  if (!titulo) return { erro: "Dê um título à pendência." };
  if (!(PRIORIDADES as readonly string[]).includes(prioridade) || !(QUEM as readonly string[]).includes(quem))
    return { erro: "Prioridade ou responsável inválidos." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("pendencias").insert({
    titulo: titulo.slice(0, 200),
    detalhe: detalhe ? detalhe.slice(0, 2000) : null,
    cliente_id: cliente || null,
    prioridade,
    quem,
    origem: "equipe",
    // O que a equipe pede para a rotina já nasce aprovado
    status: quem === "eu" ? "aprovada" : "aberta",
  });
  if (error) return { erro: error.message };
  atualizar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------------
export async function adicionarMembro(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const nome = String(dados.get("nome") ?? "").trim();
  const papel = String(dados.get("papel") ?? "editor");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "Informe um e-mail válido." };
  if (!(PAPEIS as readonly string[]).includes(papel)) return { erro: "Papel inválido." };
  const sb = await supabaseServidor();
  const { error } = await sb.from("equipe").insert({ email, nome: nome || null, papel });
  if (error) return { erro: error.code === "23505" ? "Este e-mail já está na equipe." : "Só administradores podem liberar acessos." };
  atualizar();
  return { ok: true };
}

export async function removerMembro(email: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  if (u.user?.email?.toLowerCase() === email) return { erro: "Você não pode remover o seu próprio acesso." };
  const { data, error } = await sb.from("equipe").delete().eq("email", email).select("email");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Só administradores podem remover acessos." };
  atualizar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------
const campo = (d: FormData, nome: string, max: number) => String(d.get(nome) ?? "").trim().slice(0, max);
const TRATAMENTOS = ["voce", "senhor", "neutro"] as const;
const EMOJIS = ["nenhum", "poucos", "livre"] as const;
const APROVACOES = ["automatica", "manual"] as const;
const dentro = <T extends string>(lista: readonly T[], valor: string, padrao: T): T =>
  (lista as readonly string[]).includes(valor) ? (valor as T) : padrao;

// ---------------------------------------------------------------------------
// Diretrizes: ideia principal e tom (cliente_id vazio = diretriz geral)
// ---------------------------------------------------------------------------
export async function salvarDiretrizes(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const clienteId = campo(dados, "cliente_id", 60) || null;
  const valores = {
    ideia_principal: campo(dados, "ideia_principal", 2000),
    tom: campo(dados, "tom", 1000),
    tratamento: dentro(TRATAMENTOS, campo(dados, "tratamento", 20), "voce"),
    emojis: dentro(EMOJIS, campo(dados, "emojis", 20), "nenhum"),
    assinatura: campo(dados, "assinatura", 120),
    usar: campo(dados, "usar", 600),
    evitar: campo(dados, "evitar", 600),
    exemplo_resposta: campo(dados, "exemplo_resposta", 700),
    exemplo_postagem: campo(dados, "exemplo_postagem", 700),
    aprovacao: clienteId ? dentro(APROVACOES, campo(dados, "aprovacao", 20), "automatica") : "automatica",
    revisado: true,
  };
  if (!valores.ideia_principal && !valores.tom) return { erro: "Escreva ao menos a ideia principal ou o tom." };
  const sb = await supabaseServidor();
  const base = sb.from("diretrizes").update(valores);
  const { data, error } = await (clienteId ? base.eq("cliente_id", clienteId) : base.is("cliente_id", null)).select("id");
  if (error) return { erro: error.message };
  if (!data?.length) {
    const { error: e2 } = await sb.from("diretrizes").insert({ cliente_id: clienteId, ...valores });
    if (e2) return { erro: "Sem permissão para salvar." };
  }
  atualizar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Serviços
// ---------------------------------------------------------------------------
export async function criarServico(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const clienteId = campo(dados, "cliente_id", 60);
  const nome = campo(dados, "nome", 120);
  const descricao = campo(dados, "descricao", 150);
  if (!clienteId || !nome) return { erro: "Informe o nome do serviço." };
  if (!descricao) return { erro: "Escreva uma descrição curta (até 150 caracteres)." };
  const sb = await supabaseServidor();
  // O que a equipe pede já nasce aprovado: a rotina coloca no perfil na próxima rodada
  const { error } = await sb
    .from("servicos")
    .insert({ cliente_id: clienteId, nome, descricao, status: "aprovado", origem: "equipe" });
  if (error) return { erro: "Sem permissão para incluir serviços." };
  atualizar();
  return { ok: true };
}

export async function decidirServico(id: string, status: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  if (!["aprovado", "recusado", "sugerido"].includes(status)) return { erro: "Status inválido." };
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("servicos").update({ status }).eq("id", id).neq("status", "no_perfil").select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Não foi possível alterar este serviço." };
  atualizar();
  return { ok: true };
}

export async function editarServico(id: string, nome: string, descricao: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const n = nome.trim().slice(0, 120);
  const d = descricao.trim().slice(0, 300);
  if (!n || !d) return { erro: "Preencha o nome e a descrição." };
  const sb = await supabaseServidor();
  const { data: atual, error: e1 } = await sb.from("servicos").select("status").eq("id", id).maybeSingle();
  if (e1 || !atual) return { erro: "Serviço não encontrado." };
  // Mudar um serviço que já está no Google vira uma alteração aprovada, que a rotina aplica na próxima rodada
  const status = atual.status === "no_perfil" ? "aprovado" : atual.status;
  const { error } = await sb.from("servicos").update({ nome: n, descricao: d, status }).eq("id", id);
  if (error) return { erro: error.message };
  atualizar();
  return { ok: true };
}

export async function apagarServico(id: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const sb = await supabaseServidor();
  // Serviços que vieram do perfil nunca são apagados por aqui
  const { data, error } = await sb.from("servicos").delete().eq("id", id).neq("origem", "perfil").select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Este serviço não pode ser apagado." };
  atualizar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Imagens (o arquivo sobe direto do navegador para o armazenamento; aqui só se registra)
// ---------------------------------------------------------------------------
export async function registrarMidia(
  clienteId: string,
  m: { caminho: string; url: string; nome: string; largura: number; altura: number; bytes: number; categoria: string; nota?: string },
): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  if (!m.caminho.startsWith(`${clienteId}/`) || m.caminho.includes("..")) return { erro: "Caminho de arquivo inválido." };
  const categoria = ["ADDITIONAL", "COVER"].includes(m.categoria) ? m.categoria : "ADDITIONAL";
  if (categoria === "COVER" && m.largura <= m.altura) return { erro: "A capa precisa ser uma foto horizontal." };
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  const { error } = await sb.from("midias").insert({
    cliente_id: clienteId,
    caminho: m.caminho,
    url: m.url,
    nome_original: m.nome.slice(0, 200),
    largura: Math.round(m.largura),
    altura: Math.round(m.altura),
    bytes: Math.round(m.bytes),
    categoria,
    nota: m.nota?.trim().slice(0, 300) || null,
    criado_por: u.user?.email ?? null,
  });
  if (error) return { erro: "Sem permissão para registrar a imagem." };
  atualizar();
  return { ok: true };
}

export async function retirarMidia(id: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("midias").delete().eq("id", id).eq("status", "na_fila").select("caminho");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Só dá para retirar imagens que ainda estão na fila." };
  await sb.storage.from("midias").remove([data[0].caminho]);
  atualizar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Conteúdo: postagens e respostas a avaliações
// ---------------------------------------------------------------------------
function validarTexto(tipo: string, texto: string): string | null {
  if (!texto) return "Escreva o texto.";
  if (/\{nome\}/i.test(texto)) return "Troque {nome} pelo nome de quem avaliou.";
  if (tipo === "postagem" && texto.length > 1500) return "A postagem aceita até 1.500 caracteres.";
  if (texto.length > 4000) return "A resposta aceita até 4.000 caracteres.";
  return null;
}

export async function criarConteudo(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const clienteId = campo(dados, "cliente_id", 60);
  const tipo = campo(dados, "tipo", 20);
  const texto = campo(dados, "texto", 4000);
  if (!clienteId) return { erro: "Escolha o cliente." };
  if (tipo !== "postagem" && tipo !== "resposta") return { erro: "Escolha se é postagem ou resposta." };
  const falha = validarTexto(tipo, texto);
  if (falha) return { erro: falha };
  const estrelas = Number(dados.get("estrelas") ?? 0);
  const sb = await supabaseServidor();
  const { error } = await sb.from("conteudos").insert({
    cliente_id: clienteId,
    tipo,
    texto,
    midia_id: tipo === "postagem" ? campo(dados, "midia_id", 60) || null : null,
    avaliador: tipo === "resposta" ? campo(dados, "avaliador", 120) || null : null,
    estrelas: tipo === "resposta" && estrelas >= 1 && estrelas <= 5 ? estrelas : null,
    avaliacao: tipo === "resposta" ? campo(dados, "avaliacao", 2000) || null : null,
    status: campo(dados, "acao", 20) === "aprovado" ? "aprovado" : "rascunho",
    origem: "equipe",
  });
  if (error) return { erro: "Sem permissão para criar conteúdo." };
  atualizar();
  return { ok: true };
}

export async function decidirConteudo(id: string, status: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  if (!["aprovado", "recusado", "rascunho"].includes(status)) return { erro: "Status inválido." };
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("conteudos").update({ status }).eq("id", id).neq("status", "publicado").select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Não foi possível alterar este conteúdo." };
  atualizar();
  return { ok: true };
}

export async function editarConteudo(id: string, texto: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const limpo = texto.trim();
  const sb = await supabaseServidor();
  const { data: atual } = await sb.from("conteudos").select("tipo,status").eq("id", id).maybeSingle();
  if (!atual) return { erro: "Conteúdo não encontrado." };
  if (atual.status === "publicado") return { erro: "Conteúdo já publicado não pode ser editado." };
  const falha = validarTexto(atual.tipo, limpo);
  if (falha) return { erro: falha };
  // Editar um texto aprovado volta a pedir decisão
  const { error } = await sb
    .from("conteudos")
    .update({ texto: limpo, status: atual.status === "aprovado" ? "rascunho" : atual.status })
    .eq("id", id);
  if (error) return { erro: error.message };
  atualizar();
  return { ok: true };
}

export async function apagarConteudo(id: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("conteudos").delete().eq("id", id).neq("status", "publicado").select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Este conteúdo não pode ser apagado." };
  atualizar();
  return { ok: true };
}
