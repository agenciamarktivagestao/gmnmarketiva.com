import assert from "node:assert/strict";
import test from "node:test";
import { agrupar } from "./agrupar.ts";
import {
  aprovavelComUmClique,
  cartoesDe,
  formatarTempo,
  mandarParaOFim,
  ordenarAbertas,
  segundosPorCard,
  segundosRestantes,
  tipoDoCartao,
  vizinho,
} from "./triagem.ts";

const p = (id: string, titulo: string, extra: Record<string, unknown> = {}) =>
  ({ id, titulo, quem: "voce", status: "aberta", prioridade: "media", cliente_id: id, criado_em: "2026-11-10T10:00:00Z", comentarios: [], ...extra }) as never;

test("a fila só tem pendências abertas, por prioridade e depois da mais antiga", () => {
  const lista = [
    p("a", "Baixa velha", { prioridade: "baixa", criado_em: "2026-10-01T00:00:00Z" }),
    p("b", "Média nova", { criado_em: "2026-11-12T00:00:00Z" }),
    p("c", "Alta", { prioridade: "alta", criado_em: "2026-11-14T00:00:00Z" }),
    p("d", "Média velha", { criado_em: "2026-11-01T00:00:00Z" }),
    p("e", "Já aprovada", { status: "aprovada", prioridade: "alta" }),
  ];
  const ids = ordenarAbertas(lista).map((x: { id: string }) => x.id);
  assert.deepEqual(ids, ["c", "d", "b", "a"]);
});

test("pendências iguais contam como um card só", () => {
  const lista = ordenarAbertas([p("1", "Capa vertical"), p("2", "Capa vertical"), p("3", "Outra")]);
  const cartoes = cartoesDe(agrupar(lista));
  assert.equal(cartoes.length, 2);
  assert.deepEqual(cartoes[0].ids, ["1", "2"]);
  assert.deepEqual(cartoes[1].ids, ["3"]);
});

test("tecla A só aprova de uma vez o que é aprovação simples", () => {
  assert.equal(aprovavelComUmClique([p("1", "x")]), true);
  assert.equal(aprovavelComUmClique([p("1", "x", { kind: "approve" }), p("2", "x", { kind: "approve" })]), true);
  assert.equal(aprovavelComUmClique([p("1", "x", { kind: "choose" })]), false);
  assert.equal(aprovavelComUmClique([p("1", "x", { kind: "upload" })]), false);
  assert.equal(aprovavelComUmClique([p("1", "x", { kind: "external" })]), false);
  assert.equal(aprovavelComUmClique([p("1", "x", { payload: { avaliacoes: [{ review_id: "r" }] } })]), false);
  assert.equal(aprovavelComUmClique([]), false);
  assert.equal(tipoDoCartao([p("1", "x", { payload: { avaliacoes: [{ review_id: "r" }] } })]), "avaliacoes");
  assert.equal(tipoDoCartao([p("1", "x")]), "approve");
});

test("J e K andam só entre os cards que faltam e dão a volta", () => {
  const ordem = ["a", "b", "c", "d"];
  const faltam = new Set(["a", "c", "d"]);
  assert.equal(vizinho(ordem, faltam, "a", 1), "c");
  assert.equal(vizinho(ordem, faltam, "d", 1), "a");
  assert.equal(vizinho(ordem, faltam, "a", -1), "d");
  assert.equal(vizinho(ordem, faltam, "c", -1), "a");
  // o card atual já saiu da fila (foi decidido): o próximo é o seguinte na ordem
  assert.equal(vizinho(ordem, new Set(["c", "d"]), "b", 1), "c");
  assert.equal(vizinho(ordem, new Set(["a"]), "b", 1), "a");
  assert.equal(vizinho(ordem, new Set(["a"]), "a", 1), "a");
  assert.equal(vizinho(ordem, new Set(), "a", 1), null);
});

test("pular manda o card para o fim da fila", () => {
  assert.deepEqual(mandarParaOFim(["a", "b", "c"], "a"), ["b", "c", "a"]);
  assert.deepEqual(mandarParaOFim(["a", "b", "c"], "c"), ["a", "b", "c"]);
});

test("a estimativa começa em 25 s por card e passa a seguir o ritmo de quem decide", () => {
  assert.equal(segundosPorCard([]), 25);
  assert.equal(segundosRestantes(10, []), 250);
  // 10 cards decididos em 5 s cada: a média cai bastante, sem zerar de uma vez
  const ritmo = segundosPorCard(Array(10).fill(5));
  assert.ok(ritmo < 12 && ritmo > 5, String(ritmo));
  // uma pausa de 10 minutos não vira estimativa absurda
  assert.ok(segundosPorCard([600]) <= (120 + 75) / 4 + 0.01);
});

test("o tempo aparece em minutos, de forma aproximada", () => {
  assert.equal(formatarTempo(20), "menos de 1 min");
  assert.equal(formatarTempo(60), "menos de 1 min");
  assert.equal(formatarTempo(61), "cerca de 2 min");
  assert.equal(formatarTempo(11 * 60), "cerca de 11 min");
  assert.equal(formatarTempo(3600), "cerca de 1 h");
  assert.equal(formatarTempo(3900), "cerca de 1 h 5 min");
});
