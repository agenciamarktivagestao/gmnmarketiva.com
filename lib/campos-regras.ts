import type { Pendencia } from "./tipos";

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// A pendência ainda não guarda a que campo do perfil se refere, então o campo é inferido pelo título.
// A primeira regra que casar vale. Títulos que não casam com nenhuma ficam sem campo (sem link na matriz).
const REGRAS: [RegExp, string[]][] = [
  [/avaliac|resposta pronta/, ["avaliacoes"]],
  [/sem fotos e sem capa/, ["fotos", "capa"]],
  [/fotos? no drive|poucas fotos|sem pasta no drive/, ["fotos"]],
  [/capa/, ["capa"]],
  [/horario|24 horas/, ["horario"]],
  [/area de atendimento/, ["area"]],
  [/atributos/, ["atributos"]],
  [/categoria/, ["categorias"]],
  [/servico|lentes de contato dental|joias/, ["servicos"]],
  [/descricao/, ["descricao"]],
  [/nome e endereco/, ["nome", "endereco"]],
  [/nome com palavras/, ["nome"]],
  [/endereco/, ["endereco"]],
  [/postagem|\bposts?\b/, ["posts"]],
];

export function camposDaPendencia(p: Pick<Pendencia, "titulo">): string[] {
  const titulo = semAcento(p.titulo);
  return REGRAS.find(([regra]) => regra.test(titulo))?.[1] ?? [];
}
