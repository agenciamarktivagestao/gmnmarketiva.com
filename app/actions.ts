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
