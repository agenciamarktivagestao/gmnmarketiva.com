import type { AjustesCliente, AjustesRotina } from "./tipos";

// Tudo liberado, como a rotina já trabalhava antes de existir a tela Rotina
export const AJUSTES_PADRAO: AjustesRotina = {
  ativa: true,
  limite_ajustes: 10,
  meta_minima: 4,
  max_postagens: 4,
  responder_avaliacoes: true,
  publicar_postagens: true,
  enviar_fotos: true,
  atualizar_servicos: true,
  atualizado_em: null,
  atualizado_por: null,
};

export const ajustesDoClientePadrao = (clienteId: string): AjustesCliente => ({
  cliente_id: clienteId,
  pausada: false,
  fotos: true,
  servicos: true,
  postagens: true,
  respostas: true,
  nota: "",
});

// As quatro ações que dá para ligar ou desligar em cada cliente
export const ACOES_DO_CLIENTE: { chave: "fotos" | "servicos" | "postagens" | "respostas"; nome: string }[] = [
  { chave: "fotos", nome: "Enviar fotos" },
  { chave: "servicos", nome: "Atualizar serviços" },
  { chave: "postagens", nome: "Publicar postagens" },
  { chave: "respostas", nome: "Responder avaliações" },
];

const inteiro = (v: unknown, padrao: number) => {
  const n = typeof v === "string" ? Number(v.trim()) : typeof v === "number" ? v : NaN;
  return Number.isInteger(n) ? n : padrao;
};

export type EntradaAjustes = { limite_ajustes: unknown; meta_minima: unknown; max_postagens: unknown };

// Confere os três números. Devolve o texto do erro, ou null se estiver tudo certo.
export function conferirNumeros(e: EntradaAjustes): string | null {
  const limite = inteiro(e.limite_ajustes, NaN);
  const meta = inteiro(e.meta_minima, NaN);
  const posts = inteiro(e.max_postagens, NaN);
  if (!Number.isInteger(limite) || limite < 1 || limite > 20) return "O limite de ajustes por noite deve ser um número de 1 a 20.";
  if (!Number.isInteger(meta) || meta < 0 || meta > 20) return "A meta mínima deve ser um número de 0 a 20.";
  if (meta > limite) return "A meta mínima não pode ser maior que o limite de ajustes por noite.";
  if (!Number.isInteger(posts) || posts < 0 || posts > 16) return "O máximo de postagens por noite deve ser um número de 0 a 16.";
  return null;
}

// O que vem do banco (ou nada) vira um objeto completo; campo que faltar usa o padrão
export function normalizarAjustes(raw: Partial<Record<keyof AjustesRotina, unknown>> | null | undefined): AjustesRotina {
  const r = raw ?? {};
  const bool = (v: unknown, p: boolean) => (typeof v === "boolean" ? v : p);
  return {
    ativa: bool(r.ativa, AJUSTES_PADRAO.ativa),
    limite_ajustes: inteiro(r.limite_ajustes, AJUSTES_PADRAO.limite_ajustes),
    meta_minima: inteiro(r.meta_minima, AJUSTES_PADRAO.meta_minima),
    max_postagens: inteiro(r.max_postagens, AJUSTES_PADRAO.max_postagens),
    responder_avaliacoes: bool(r.responder_avaliacoes, true),
    publicar_postagens: bool(r.publicar_postagens, true),
    enviar_fotos: bool(r.enviar_fotos, true),
    atualizar_servicos: bool(r.atualizar_servicos, true),
    atualizado_em: typeof r.atualizado_em === "string" ? r.atualizado_em : null,
    atualizado_por: typeof r.atualizado_por === "string" ? r.atualizado_por : null,
  };
}

// Cliente sem linha na tabela = tudo liberado
export function ajustesPorCliente(linhas: AjustesCliente[], clienteIds: string[]): Map<string, AjustesCliente> {
  const mapa = new Map(linhas.map((l) => [l.cliente_id, l]));
  return new Map(clienteIds.map((id) => [id, mapa.get(id) ?? ajustesDoClientePadrao(id)]));
}

// O cliente está com tudo liberado e sem recado? Então não precisa de linha no banco.
export const eClientePadrao = (a: AjustesCliente) =>
  !a.pausada && a.fotos && a.servicos && a.postagens && a.respostas && a.nota.trim() === "";

// Uma frase curta do que está restrito num cliente, para a lista
export function resumoDoCliente(a: AjustesCliente): string {
  if (a.pausada) return "Pausado: a rotina não mexe neste cliente.";
  const desligadas = ACOES_DO_CLIENTE.filter((x) => !a[x.chave]).map((x) => x.nome.toLowerCase());
  return desligadas.length === 0 ? "Tudo liberado." : `Sem: ${desligadas.join(", ")}.`;
}
