import type { Entrada } from "./agrupar";
import type { Pendencia, Prioridade } from "./tipos";

// Um card da triagem: uma pendência ou um grupo de pendências iguais (decidido de uma vez)
export type Cartao = { chave: string; ids: string[] };

const PESO: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

// Só pendências abertas, da mais urgente para a menos urgente e, dentro da mesma prioridade,
// da mais antiga para a mais nova.
export const ordenarAbertas = (lista: Pendencia[]): Pendencia[] =>
  lista
    .filter((p) => p.status === "aberta")
    .sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || a.criado_em.localeCompare(b.criado_em));

// Pendências iguais (já agrupadas por `agrupar`) viram um card só
export const cartoesDe = (entradas: Entrada[]): Cartao[] =>
  entradas.map((e) => (e.tipo === "grupo" ? { chave: e.chave, ids: e.itens.map((p) => p.id) } : { chave: e.p.id, ids: [e.p.id] }));

// A decisão em um clique (tecla A) só vale quando a pendência é uma aprovação simples:
// escolha, dado, foto e avaliações pedem uma resposta própria; "external" só se resolve fora do painel.
export function aprovavelComUmClique(itens: Pendencia[]): boolean {
  return (
    itens.length > 0 &&
    itens.every((p) => {
      const kind = p.kind ?? "approve";
      const temAvaliacoes = ((p.payload as { avaliacoes?: unknown[] } | null)?.avaliacoes?.length ?? 0) > 0;
      return kind === "approve" && !temAvaliacoes;
    })
  );
}

export const tipoDoCartao = (itens: Pendencia[]): "approve" | "avaliacoes" | "choose" | "input" | "upload" | "external" => {
  const p = itens[0];
  if (!p) return "approve";
  const kind = p.kind ?? "approve";
  if (kind === "approve" && ((p.payload as { avaliacoes?: unknown[] } | null)?.avaliacoes?.length ?? 0) > 0) return "avaliacoes";
  return kind;
};

// Próximo (passo = 1) ou anterior (passo = -1) card ainda não resolvido, dando a volta no fim da fila.
// Devolve null quando não resta nenhum e a própria chave quando só resta o atual.
export function vizinho(ordem: string[], pendentes: Set<string>, atual: string | null, passo: 1 | -1): string | null {
  const restam = ordem.filter((k) => pendentes.has(k));
  if (restam.length === 0) return null;
  const pos = atual ? ordem.indexOf(atual) : -1;
  if (pos === -1) return restam[0];
  for (let i = 1; i <= ordem.length; i++) {
    const k = ordem[(pos + passo * i + ordem.length * i) % ordem.length];
    if (pendentes.has(k)) return k;
  }
  return null;
}

// Pular: o card vai para o fim da fila e o próximo assume o lugar
export const mandarParaOFim = (ordem: string[], chave: string) => [...ordem.filter((k) => k !== chave), chave];

// Estimativa de tempo: média dos últimos cards decididos, puxada para um valor inicial enquanto há pouco dado.
export const SEGUNDOS_INICIAIS = 25;
const PESO_INICIAL = 3;
const MAXIMO_POR_CARD = 120; // uma pausa longa não deve contar como tempo de decisão
export function segundosPorCard(duracoes: number[]): number {
  const recentes = duracoes.slice(-10).map((d) => Math.min(Math.max(d, 1), MAXIMO_POR_CARD));
  const soma = recentes.reduce((a, b) => a + b, 0);
  return (soma + SEGUNDOS_INICIAIS * PESO_INICIAL) / (recentes.length + PESO_INICIAL);
}
export const segundosRestantes = (restantes: number, duracoes: number[]) => Math.round(restantes * segundosPorCard(duracoes));

export function formatarTempo(segundos: number): string {
  const min = Math.ceil(segundos / 60);
  if (min <= 1) return "menos de 1 min";
  if (min < 60) return `cerca de ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `cerca de ${h} h` : `cerca de ${h} h ${m} min`;
}
