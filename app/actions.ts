"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { modoDemonstracao } from "@/lib/ambiente";
import { supabaseServidor } from "@/lib/supabase";
import type { Resultado } from "@/lib/acoes-tipos";
import { conferirEntrada, conferirEscolha, type Conferida, type Resposta } from "@/lib/respostas";
import { conferirNumeros, eClientePadrao } from "@/lib/rotina";
import type { PayloadApprove, PayloadChoose, PayloadInput } from "@/lib/tipos";

const DEMO: Resultado = { erro: "Modo demonstração: conecte o Supabase para salvar." };
const STATUS = ["aberta", "aprovada", "recusada", "concluida"] as const;
const PRIORIDADES = ["alta", "media", "baixa"] as const;
const QUEM = ["eu", "voce", "bloq"] as const;
const PAPEIS = ["admin", "editor", "leitura"] as const;

function atualizar() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Novidades: marca como vistas (é o que apaga o selo do menu)
// ---------------------------------------------------------------------------
export async function marcarNovidadesVistas(): Promise<void> {
  if (modoDemonstracao()) return;
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return;
  const { error } = await sb.from("mudancas_vistas").upsert({ email, visto_ate: new Date().toISOString() });
  if (error) console.error("mudancas_vistas:", error.message);
  else atualizar();
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

// Decisão em grupo: cada pendência recebe a sua própria decisão (uma linha atualizada por id,
// com o gatilho gravando decidido_por, decidido_em e o histórico de cada uma).
// `de` é o status em que o card foi mostrado: quem já mudou por outro caminho não é sobrescrito.
export async function decidirVarias(ids: string[], status: string, de: string): Promise<Resultado & { feitas?: number }> {
  if (modoDemonstracao()) return DEMO;
  if (!(STATUS as readonly string[]).includes(status) || !(STATUS as readonly string[]).includes(de)) return { erro: "Status inválido." };
  const lista = [...new Set(ids)].filter((i) => /^[0-9a-f-]{36}$/i.test(i)).slice(0, 100);
  if (!lista.length) return { erro: "Escolha ao menos uma pendência." };
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("pendencias").update({ status }).in("id", lista).eq("status", de).select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Sem permissão ou as pendências já mudaram. Atualize a página." };
  atualizar();
  if (data.length < lista.length) {
    return { erro: `${data.length} de ${lista.length} foram atualizadas. As outras já tinham mudado.`, feitas: data.length };
  }
  return { ok: true, feitas: data.length };
}

// Resposta a uma pendência que pede escolha, dado ou foto. Segue o mesmo contrato com a rotina:
// o status vira "aprovada" (a rotina pode executar), o texto da resposta entra como comentário
// e o valor estruturado fica em `resposta`. O servidor confere tudo contra o `payload` da pendência.
export async function responder(id: string, r: Resposta): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const sb = await supabaseServidor();
  const { data: p, error: e0 } = await sb.from("pendencias").select("kind,payload,status,cliente_id").eq("id", id).maybeSingle();
  if (e0 || !p) return { erro: "Pendência não encontrada." };
  if (p.status !== "aberta") return { erro: "Esta pendência já foi decidida. Reabra para responder de novo." };
  if (p.kind !== r.tipo) return { erro: "Esta pendência pede outro tipo de resposta." };

  let conferida: Conferida;
  if (r.tipo === "choose") conferida = conferirEscolha((p.payload ?? {}) as PayloadChoose, r);
  else if (r.tipo === "input") conferida = conferirEntrada((p.payload ?? {}) as PayloadInput, r.campo, r.valor);
  else {
    const ids = [...new Set(r.midias)].filter((i) => /^[0-9a-f-]{36}$/i.test(i)).slice(0, 12);
    if (!p.cliente_id || !ids.length) return { erro: "Envie ao menos uma foto." };
    const { data: fotos } = await sb.from("midias").select("id,categoria").in("id", ids).eq("cliente_id", p.cliente_id).eq("status", "na_fila");
    if (!fotos?.length) return { erro: "Não encontrei as fotos enviadas. Tente de novo." };
    const capas = fotos.filter((f) => f.categoria === "COVER").length;
    const partes = [capas ? `${capas} ${capas === 1 ? "capa horizontal" : "capas"}` : "", fotos.length - capas ? `${fotos.length - capas} ${fotos.length - capas === 1 ? "foto" : "fotos"} para a galeria` : ""].filter(Boolean);
    conferida = { valor: { midias: fotos.map((f) => f.id) }, resumo: `Enviei ${partes.join(" e ")}. Estão na fila para o Google.` };
  }
  if ("erro" in conferida) return { erro: conferida.erro };

  const resposta = { tipo: r.tipo, valor: conferida.valor, resumo: conferida.resumo, em: new Date().toISOString() };
  const { data, error } = await sb.from("pendencias").update({ status: "aprovada", resposta }).eq("id", id).eq("status", "aberta").select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Sem permissão ou a pendência já mudou. Atualize a página." };

  const { data: u } = await sb.auth.getUser();
  const { error: e2 } = await sb
    .from("comentarios")
    .insert({ pendencia_id: id, texto: `Resposta pelo painel: ${conferida.resumo}`.slice(0, 2000), autor: u.user?.email ?? "equipe" });
  atualizar();
  if (e2) return { erro: "A resposta foi salva, mas o comentário para a rotina falhou. Comente de novo com o que você respondeu." };
  return { ok: true };
}

// Avaliações dentro da pendência: cada uma é publicada (vira um conteúdo aprovado, que a rotina
// publica na próxima rodada) ou vai para revisão do Google. Quando todas têm destino, a pendência
// vira "aprovada". O andamento fica em `resposta` e cada passo vira um comentário para a rotina.
export async function responderAvaliacao(id: string, reviewId: string, acao: string, texto?: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  if (acao !== "publicar" && acao !== "revisao") return { erro: "Ação inválida." };
  const sb = await supabaseServidor();
  const { data: p, error: e0 } = await sb.from("pendencias").select("kind,payload,status,cliente_id,resposta").eq("id", id).maybeSingle();
  if (e0 || !p) return { erro: "Pendência não encontrada." };
  if (p.status !== "aberta") return { erro: "Esta pendência já foi decidida. Reabra para responder de novo." };
  const avaliacoes = (p.payload as PayloadApprove | null)?.avaliacoes ?? [];
  const av = avaliacoes.find((a) => a.review_id === reviewId);
  if (!av || !p.cliente_id) return { erro: "Avaliação não encontrada nesta pendência." };
  const andamento = ((p.resposta as { valor?: Record<string, { acao: string; conteudo_id?: string }> } | null)?.valor ?? {}) as Record<string, { acao: string; conteudo_id?: string }>;
  if (andamento[reviewId]) return { erro: "Esta avaliação já foi tratada." };

  // Publicar: o texto entra como rascunho e só vira "aprovado" depois que a pendência registrou a decisão
  let conteudoId: string | undefined;
  if (acao === "publicar") {
    const limpo = String(texto ?? "").trim().slice(0, 4000);
    const falha = validarTexto("resposta", limpo);
    if (falha) return { erro: falha };
    const { data: c, error: e1 } = await sb
      .from("conteudos")
      .insert({
        cliente_id: p.cliente_id,
        tipo: "resposta",
        avaliador: av.avaliador.slice(0, 120),
        estrelas: av.estrelas >= 1 && av.estrelas <= 5 ? av.estrelas : null,
        avaliacao: av.texto ? av.texto.slice(0, 2000) : null,
        review_id: av.review_id,
        texto: limpo,
        status: "rascunho",
        origem: "equipe",
      })
      .select("id")
      .single();
    if (e1 || !c) return { erro: "Sem permissão para criar a resposta." };
    conteudoId = c.id;
  }

  const novo = { ...andamento, [reviewId]: { acao, ...(conteudoId ? { conteudo_id: conteudoId } : {}) } };
  const todas = avaliacoes.every((a) => novo[a.review_id]);
  const nota = `${av.avaliador} (${av.estrelas}★)`;
  const linha = acao === "publicar" ? `${nota}: resposta aprovada para publicar` : `${nota}: pedir revisão ao Google`;
  const resumo = avaliacoes
    .filter((a) => novo[a.review_id])
    .map((a) => `${a.avaliador} (${a.estrelas}★): ${novo[a.review_id].acao === "publicar" ? "resposta aprovada" : "revisão pedida ao Google"}`)
    .join("; ");
  const resposta = { tipo: "avaliacoes", valor: novo, resumo, em: new Date().toISOString() };
  const { data, error } = await sb
    .from("pendencias")
    .update({ resposta, status: todas ? "aprovada" : "aberta" })
    .eq("id", id)
    .eq("status", "aberta")
    .select("id");
  if (error || !data?.length) {
    if (conteudoId) await sb.from("conteudos").delete().eq("id", conteudoId).eq("status", "rascunho");
    return { erro: error?.message ?? "Sem permissão ou a pendência já mudou. Atualize a página." };
  }

  if (conteudoId) {
    const { error: e2 } = await sb.from("conteudos").update({ status: "aprovado" }).eq("id", conteudoId).eq("status", "rascunho");
    if (e2) {
      atualizar();
      return { erro: "A decisão foi registrada, mas a resposta ficou como rascunho. Aprove o texto em Conteúdo." };
    }
  }
  const { data: u } = await sb.auth.getUser();
  await sb.from("comentarios").insert({
    pendencia_id: id,
    texto: `Resposta pelo painel: ${linha}${acao === "revisao" ? ". A rotina não consegue pedir revisão; é pelo perfil, no Chrome." : "."}`.slice(0, 2000),
    autor: u.user?.email ?? "equipe",
  });
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

// Mesmo comentário em várias pendências (card de pendências iguais na triagem): um comentário por pendência,
// do jeito que a rotina já lê.
export async function comentarVarias(ids: string[], texto: string): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva o comentário." };
  const lista = [...new Set(ids)].filter((i) => /^[0-9a-f-]{36}$/i.test(i)).slice(0, 100);
  if (!lista.length) return { erro: "Escolha ao menos uma pendência." };
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  const autor = u.user?.email ?? "equipe";
  const { error } = await sb.from("comentarios").insert(lista.map((id) => ({ pendencia_id: id, texto: limpo.slice(0, 2000), autor })));
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
): Promise<Resultado & { id?: string }> {
  if (modoDemonstracao()) return DEMO;
  if (!m.caminho.startsWith(`${clienteId}/`) || m.caminho.includes("..")) return { erro: "Caminho de arquivo inválido." };
  const categoria = ["ADDITIONAL", "COVER"].includes(m.categoria) ? m.categoria : "ADDITIONAL";
  if (categoria === "COVER" && m.largura <= m.altura) return { erro: "A capa precisa ser uma foto horizontal." };
  const sb = await supabaseServidor();
  const { data: u } = await sb.auth.getUser();
  const { data: criada, error } = await sb.from("midias").insert({
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
  }).select("id").single();
  if (error || !criada) return { erro: "Sem permissão para registrar a imagem." };
  atualizar();
  return { ok: true, id: criada.id };
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

// ---------------------------------------------------------------------------
// Rotina: o que a rotina da madrugada pode fazer (ela lê estas tabelas antes de começar)
// ---------------------------------------------------------------------------
const marcado = (d: FormData, nome: string) => d.get(nome) === "on";

export async function salvarAjustesGerais(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const erro = conferirNumeros({
    limite_ajustes: dados.get("limite_ajustes"),
    meta_minima: dados.get("meta_minima"),
    max_postagens: dados.get("max_postagens"),
  });
  if (erro) return { erro };
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("rotina_ajustes")
    .update({
      ativa: marcado(dados, "ativa"),
      limite_ajustes: Number(dados.get("limite_ajustes")),
      meta_minima: Number(dados.get("meta_minima")),
      max_postagens: Number(dados.get("max_postagens")),
      responder_avaliacoes: marcado(dados, "responder_avaliacoes"),
      publicar_postagens: marcado(dados, "publicar_postagens"),
      enviar_fotos: marcado(dados, "enviar_fotos"),
      atualizar_servicos: marcado(dados, "atualizar_servicos"),
    })
    .eq("id", 1)
    .select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Só administradores podem mudar os ajustes gerais da rotina." };
  atualizar();
  return { ok: true };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cada cliente que continua com tudo liberado e sem recado perde a linha: sem linha = tudo liberado.
export async function salvarAjustesClientes(_: Resultado | null, dados: FormData): Promise<Resultado> {
  if (modoDemonstracao()) return DEMO;
  const ids = [...new Set(dados.getAll("cliente").map(String))].filter((id) => UUID.test(id));
  if (ids.length === 0) return { erro: "Nenhum cliente para salvar." };
  const linhas = ids.map((id) => ({
    cliente_id: id,
    pausada: marcado(dados, `pausada:${id}`),
    fotos: marcado(dados, `fotos:${id}`),
    servicos: marcado(dados, `servicos:${id}`),
    postagens: marcado(dados, `postagens:${id}`),
    respostas: marcado(dados, `respostas:${id}`),
    nota: campo(dados, `nota:${id}`, 300),
  }));
  const mudados = linhas.filter((l) => !eClientePadrao(l));
  const liberados = linhas.filter((l) => eClientePadrao(l)).map((l) => l.cliente_id);
  const sb = await supabaseServidor();
  if (mudados.length > 0) {
    const { error } = await sb.from("rotina_clientes").upsert(mudados, { onConflict: "cliente_id" });
    if (error) return { erro: "Sem permissão para salvar: " + error.message };
  }
  if (liberados.length > 0) {
    const { error } = await sb.from("rotina_clientes").delete().in("cliente_id", liberados);
    if (error) return { erro: "Sem permissão para salvar: " + error.message };
  }
  atualizar();
  return { ok: true };
}
