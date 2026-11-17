import type { Pendencia } from "./tipos";

export type Entrada =
  | { tipo: "item"; p: Pendencia }
  | { tipo: "grupo"; chave: string; titulo: string; itens: Pendencia[] };

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Pendências com o mesmo título e o mesmo tipo viram um só card.
// Quem resolve (quem) e o status entram na chave para que uma decisão em grupo nunca
// atinja uma pendência que está em outro ponto do fluxo. A ordem da lista é mantida:
// o grupo fica onde está o seu primeiro item.
export function agrupar(lista: Pendencia[]): Entrada[] {
  // Pendência com avaliações precisa de decisão avaliação por avaliação: cada uma tem chave própria e nunca agrupa
  const temAvaliacoes = (p: Pendencia) => {
    const av = (p.payload as { avaliacoes?: unknown[] } | null | undefined)?.avaliacoes;
    return Array.isArray(av) && av.length > 0;
  };
  const chaveDe = (p: Pendencia) => [semAcento(p.titulo), p.quem, p.status, p.kind ?? "approve", temAvaliacoes(p) ? p.id : ""].join("|");
  const porChave = new Map<string, Pendencia[]>();
  lista.forEach((p) => porChave.set(chaveDe(p), [...(porChave.get(chaveDe(p)) ?? []), p]));

  const vistos = new Set<string>();
  const saida: Entrada[] = [];
  for (const p of lista) {
    const chave = chaveDe(p);
    const itens = porChave.get(chave) ?? [];
    if (itens.length < 2) {
      saida.push({ tipo: "item", p });
    } else if (!vistos.has(chave)) {
      vistos.add(chave);
      saida.push({ tipo: "grupo", chave, titulo: p.titulo, itens });
    }
  }
  return saida;
}
