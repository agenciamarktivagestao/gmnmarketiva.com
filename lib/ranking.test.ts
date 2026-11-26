import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORA_DO_TOP_20,
  agruparPorCliente,
  agruparPorPalavra,
  bandaDaPosicao,
  compararMedicoes,
  deSolvDaMudanca,
  fraseDaMudanca,
  fraseDoCliente,
  lerPosicoes,
  medicaoConfiavel,
  resumir,
  resumoDoCliente,
  textoDaPosicao,
} from "./ranking.ts";
import type { Medicao, Posicao } from "./ranking.ts";

const F = FORA_DO_TOP_20;

// Grade 3x3 (9 pontos) com as posições dadas
const m = (dia: string, posicoes: Posicao[], extra: Partial<Medicao> = {}): Medicao => ({
  cliente_id: "c1",
  dia,
  palavra: "dentista londrina",
  grade: 3,
  espacamento_km: 2,
  posicoes,
  fonte: "geogrid",
  ...extra,
});

test("lerPosicoes: confere o tamanho e troca o que está fora de 1 a 21 por 'sem leitura'", () => {
  assert.deepEqual(lerPosicoes([1, 2, 3, 4, 5, 6, 7, 21, null], 3), [1, 2, 3, 4, 5, 6, 7, 21, null]);
  assert.equal(lerPosicoes([1, 2, 3], 3), null);
  assert.equal(lerPosicoes("[1,2,3]", 3), null);
  assert.equal(lerPosicoes(null, 3), null);
  assert.deepEqual(lerPosicoes([0, 22, 2.5, "a", 5, 6, 7, 8, 9], 3), [null, null, null, null, 5, 6, 7, 8, 9]);
});

test("resumir: presença no top 3, onde aparece e posição média só onde aparece", () => {
  // lidos 8 (um ponto sem leitura); aparece em 6; no top 3 em 4 (1, 2, 3 e 2)
  const r = resumir([1, 2, 3, 4, F, null, 10, F, 2]);
  assert.equal(r.pontos, 9);
  assert.equal(r.lidos, 8);
  assert.equal(r.apareceEm, 6);
  assert.equal(r.noTop3, 4);
  assert.equal(r.solv, 50);
  assert.equal(r.apareceEmPct, 75);
  assert.equal(r.arp, 3.67); // (1+2+3+4+10+2) / 6
});

test("resumir: perfil que não aparece em lugar nenhum tem top 3 zerado e posição média vazia", () => {
  const r = resumir([F, F, F, F, F, F, F, F, F]);
  assert.equal(r.solv, 0);
  assert.equal(r.apareceEmPct, 0);
  assert.equal(r.arp, null);
});

test("resumir: sem nenhum ponto lido não inventa número", () => {
  const r = resumir([null, null, null, null, null, null, null, null, null]);
  assert.equal(r.lidos, 0);
  assert.equal(r.solv, null);
  assert.equal(r.apareceEmPct, null);
  assert.equal(r.arp, null);
});

test("medicaoConfiavel: precisa ter lido pelo menos 80% dos pontos", () => {
  assert.equal(medicaoConfiavel(resumir([1, 2, 3, 4, 5, 6, 7, 8, null])), true); // 8 de 9
  assert.equal(medicaoConfiavel(resumir([1, 2, 3, 4, 5, 6, null, null, null])), false); // 6 de 9
});

test("bandaDaPosicao e textoDaPosicao", () => {
  assert.equal(bandaDaPosicao(1), "top3");
  assert.equal(bandaDaPosicao(3), "top3");
  assert.equal(bandaDaPosicao(4), "top10");
  assert.equal(bandaDaPosicao(10), "top10");
  assert.equal(bandaDaPosicao(11), "top20");
  assert.equal(bandaDaPosicao(20), "top20");
  assert.equal(bandaDaPosicao(21), "fora");
  assert.equal(bandaDaPosicao(null), "sem");
  assert.equal(textoDaPosicao(7), "7");
  assert.equal(textoDaPosicao(21), "20+");
  assert.equal(textoDaPosicao(null), "–");
});

test("compararMedicoes: grade ou distância diferente não se compara", () => {
  const a = m("2026-11-15", [1, 1, 1, 1, 1, 1, 1, 1, 1]);
  const b = m("2026-11-01", [5, 5, 5, 5, 5, 5, 5, 5, 5]);
  assert.equal(compararMedicoes(a, { ...b, grade: 5, posicoes: Array(25).fill(5) }).comparavel, false);
  assert.equal(compararMedicoes(a, { ...b, espacamento_km: 4 }).comparavel, false);
});

test("compararMedicoes: medição com muitos pontos sem leitura não se compara", () => {
  const boa = m("2026-11-01", [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const ruim = m("2026-11-15", [1, 2, 3, null, null, null, null, null, null]);
  const r = compararMedicoes(ruim, boa);
  assert.equal(r.comparavel, false);
});

test("compararMedicoes: mais presença no top 3 é 'subiu'; menos é 'caiu'", () => {
  const antes = m("2026-11-01", [1, 5, 8, 9, 12, 15, F, F, F]); // top 3: 1 de 9 = 11,1%
  const depois = m("2026-11-15", [1, 2, 3, 5, 8, 9, 12, F, F]); // top 3: 3 de 9 = 33,3%
  const sobe = compararMedicoes(depois, antes);
  assert.ok(sobe.comparavel);
  if (sobe.comparavel) {
    assert.equal(sobe.sentido, "subiu");
    assert.equal(sobe.porque, "top3");
    assert.equal(sobe.anteriorDia, "2026-11-01");
    assert.equal(fraseDaMudanca(sobe), "subiu 22,2 pontos no top 3");
  }
  const cai = compararMedicoes(antes, depois);
  assert.ok(cai.comparavel);
  if (cai.comparavel) {
    assert.equal(cai.sentido, "caiu");
    assert.equal(fraseDaMudanca(cai), "caiu 22,2 pontos no top 3");
  }
});

test("compararMedicoes: sem mexer no top 3, a posição média decide", () => {
  // Nenhum ponto no top 3 nas duas; a posição média cai de 14 para 9
  const antes = m("2026-11-01", [14, 14, 14, 14, 14, 14, 14, 14, 14]);
  const depois = m("2026-11-15", [9, 9, 9, 9, 9, 9, 9, 9, 9]);
  const r = compararMedicoes(depois, antes);
  assert.ok(r.comparavel);
  if (r.comparavel) {
    assert.equal(r.sentido, "subiu");
    assert.equal(r.porque, "posicao");
    assert.equal(fraseDaMudanca(r), "posição média melhorou 5");
  }
  const pior = compararMedicoes(antes, depois);
  assert.ok(pior.comparavel);
  if (pior.comparavel) assert.equal(pior.sentido, "caiu");
});

test("compararMedicoes: sem mexer no top 3 nem na posição média, a presença nos pontos decide", () => {
  // Mesma posição média (10) onde aparece; antes em 3 pontos, agora em 6
  const antes = m("2026-11-01", [10, 10, 10, F, F, F, F, F, F]);
  const depois = m("2026-11-15", [10, 10, 10, 10, 10, 10, F, F, F]);
  const r = compararMedicoes(depois, antes);
  assert.ok(r.comparavel);
  if (r.comparavel) {
    assert.equal(r.sentido, "subiu");
    assert.equal(r.porque, "presenca");
    assert.equal(fraseDaMudanca(r), "aparece em mais pontos da região");
  }
});

test("compararMedicoes: diferença pequena é 'igual'", () => {
  const antes = m("2026-11-01", [1, 5, 8, 9, 12, 15, 7, 8, 9]);
  const depois = m("2026-11-15", [1, 5, 8, 9, 12, 15, 7, 8, 10]);
  const r = compararMedicoes(depois, antes);
  assert.ok(r.comparavel);
  if (r.comparavel) {
    assert.equal(r.sentido, "igual");
    assert.equal(fraseDaMudanca(r), "sem mudança relevante");
  }
});

test("fraseDaMudanca: usa os números já arredondados e põe 'ponto' no singular quando é exatamente 1", () => {
  const resumo = (solv: number) => ({ pontos: 9, lidos: 9, apareceEm: 9, noTop3: 0, solv, apareceEmPct: 100, arp: 5 });
  const mudanca = (de: number, para: number) => ({
    comparavel: true as const,
    sentido: para > de ? ("subiu" as const) : ("caiu" as const),
    porque: "top3" as const,
    antes: resumo(de),
    agora: resumo(para),
    anteriorDia: "2026-11-01",
  });
  assert.equal(fraseDaMudanca(mudanca(10, 11)), "subiu 1 ponto no top 3");
  assert.equal(fraseDaMudanca(mudanca(11, 10)), "caiu 1 ponto no top 3");
  assert.equal(fraseDaMudanca(mudanca(10.1, 20.1)), "subiu 10 pontos no top 3");
  assert.equal(fraseDaMudanca(mudanca(0, 12.5)), "subiu 12,5 pontos no top 3");
});

test("agruparPorPalavra: acha a medição atual, a anterior e o histórico, em qualquer ordem de entrada", () => {
  const lista = [
    m("2026-11-15", [1, 2, 3, 4, 5, 6, 7, 8, 9]),
    m("2026-11-01", [F, F, F, F, F, F, F, F, F]),
    m("2026-12-01", [1, 1, 1, 1, 1, 1, 1, 1, 1]),
    m("2026-11-15", [2, 2, 2, 2, 2, 2, 2, 2, 2], { palavra: "implante dentário" }),
  ];
  const grupos = agruparPorPalavra(lista);
  assert.deepEqual(grupos.map((g) => g.palavra), ["dentista londrina", "implante dentário"]);
  const g = grupos[0];
  assert.equal(g.atual.dia, "2026-12-01");
  assert.equal(g.anterior?.dia, "2026-11-15");
  assert.deepEqual(g.historico.map((h) => h.dia), ["2026-11-01", "2026-11-15", "2026-12-01"]);
  assert.deepEqual(g.historico.map((h) => h.solv), [0, 33.3, 100]);
  assert.equal(g.mudanca?.comparavel && g.mudanca.sentido, "subiu");
  // Palavra medida uma vez só: primeira medição, sem comparação
  assert.equal(grupos[1].anterior, null);
  assert.equal(grupos[1].mudanca, null);
});

test("agruparPorPalavra: espaços sobrando no começo e no fim não criam palavra nova", () => {
  const grupos = agruparPorPalavra([m("2026-11-01", Array(9).fill(5), { palavra: "dentista londrina " }), m("2026-11-15", Array(9).fill(5))]);
  assert.equal(grupos.length, 1);
});

test("resumoDoCliente: a mudança do cliente é a das médias das palavras", () => {
  const sobe = [m("2026-11-01", [F, F, F, F, F, F, F, F, F]), m("2026-11-15", [1, 1, 1, 1, 1, 1, F, F, F])];
  const cai = [
    m("2026-11-01", [1, 1, 1, 1, 1, 1, 1, 1, 1], { palavra: "b" }),
    m("2026-11-15", [1, 1, 1, F, F, F, F, F, F], { palavra: "b" }),
  ];
  const so = resumoDoCliente("c1", agruparPorPalavra(sobe));
  assert.equal(so.sentido, "subiu");
  assert.equal(so.comparaveis, 1);
  assert.equal(so.mudanca ? deSolvDaMudanca(so.mudanca) : null, 66.7);
  assert.equal(so.misto, false);
  assert.equal(so.solvMedio, 66.7);
  assert.equal(so.ultimoDia, "2026-11-15");

  // Uma palavra sobe 66,7 pontos e outra cai 66,7: a média não mexe, mas a tela precisa avisar que elas andaram em sentidos opostos
  const empate = resumoDoCliente("c1", agruparPorPalavra([...sobe, ...cai]));
  assert.equal(empate.sentido, "igual");
  assert.equal(empate.misto, true);
  assert.equal(empate.comparaveis, 2);

  const soCai = resumoDoCliente("c1", agruparPorPalavra(cai));
  assert.equal(soCai.sentido, "caiu");
  assert.equal(soCai.misto, false);
});

test("resumoDoCliente: duas palavras com pequenas altas e uma queda grande dão queda na média, nunca 'subiu' com número negativo", () => {
  const alta = (palavra: string) => [m("2026-11-01", [F, F, F, F, F, F, F, F, F], { palavra }), m("2026-11-15", [1, F, F, F, F, F, F, F, F], { palavra })]; // 0% -> 11,1%
  const queda = [m("2026-11-01", Array(9).fill(1), { palavra: "z" }), m("2026-11-15", Array(9).fill(F), { palavra: "z" })]; // 100% -> 0%
  const r = resumoDoCliente("c1", agruparPorPalavra([...alta("a"), ...alta("b"), ...queda]));
  assert.equal(r.sentido, "caiu");
  assert.equal(r.misto, true);
  assert.match(fraseDoCliente(r), /^caiu \d+(,\d)? pontos no top 3$/);
});

test("resumoDoCliente: sem medição anterior não há sentido", () => {
  const r = resumoDoCliente("c1", agruparPorPalavra([m("2026-11-01", [1, 2, 3, 4, 5, 6, 7, 8, 9])]));
  assert.equal(r.sentido, null);
  assert.equal(r.mudanca, null);
  assert.equal(r.comparaveis, 0);
  assert.equal(r.solvMedio, 33.3);
});

test("agruparPorCliente: separa os clientes", () => {
  const lista = [m("2026-11-01", Array(9).fill(2)), m("2026-11-01", Array(9).fill(F), { cliente_id: "c2" })];
  const clientes = agruparPorCliente(lista);
  assert.equal(clientes.length, 2);
  assert.deepEqual(clientes.map((c) => c.clienteId).sort(), ["c1", "c2"]);
});

test("fraseDoCliente: diz quanto mexeu no top 3 e, quando foi pouco, só se subiu ou caiu na posição", () => {
  const sobe = resumoDoCliente("c1", agruparPorPalavra([m("2026-11-01", [F, F, F, F, F, F, F, F, F]), m("2026-11-15", [1, 1, 1, 1, 1, 1, F, F, F])]));
  assert.equal(fraseDoCliente(sobe), "subiu 66,7 pontos no top 3");

  const primeira = resumoDoCliente("c1", agruparPorPalavra([m("2026-11-01", [1, 2, 3, 4, 5, 6, 7, 8, 9])]));
  assert.equal(fraseDoCliente(primeira), "primeira medição");

  // Top 3 zerado nas duas, mas a posição média melhorou: subiu, sem prometer pontos no top 3
  const soPosicao = resumoDoCliente("c1", agruparPorPalavra([m("2026-11-01", Array(9).fill(14)), m("2026-11-15", Array(9).fill(9))]));
  assert.equal(soPosicao.sentido, "subiu");
  assert.equal(fraseDoCliente(soPosicao), "posição média melhorou 5");

  const igual = resumoDoCliente("c1", agruparPorPalavra([m("2026-11-01", Array(9).fill(9)), m("2026-11-15", Array(9).fill(9))]));
  assert.equal(fraseDoCliente(igual), "sem mudança relevante");
});
