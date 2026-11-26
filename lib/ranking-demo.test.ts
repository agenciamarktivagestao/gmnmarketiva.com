import { test } from "node:test";
import assert from "node:assert/strict";
import { rankingDemonstracao } from "./ranking-demo.ts";
import { agruparPorCliente, agruparPorPalavra, lerPosicoes } from "./ranking.ts";

const idDe = (slug: string) => `c-${slug}`;

test("rankingDemonstracao: toda medição fecha com a grade e só tem valores válidos", () => {
  const lista = rankingDemonstracao(idDe, "2026-11-26");
  assert.ok(lista.length > 0);
  for (const m of lista) {
    assert.deepEqual(lerPosicoes(m.posicoes, m.grade), m.posicoes, `${m.palavra} em ${m.dia}`);
    assert.equal(m.posicoes.length, m.grade * m.grade);
  }
});

test("rankingDemonstracao: sempre a mesma saída e datas de 15 em 15 dias até 11 dias atrás", () => {
  const a = rankingDemonstracao(idDe, "2026-11-26");
  const b = rankingDemonstracao(idDe, "2026-11-26");
  assert.deepEqual(a, b);
  const dias = a.filter((m) => m.palavra === "dentista londrina").map((m) => m.dia);
  assert.deepEqual(dias, ["2026-10-16", "2026-10-31", "2026-11-15"]);
});

test("rankingDemonstracao: mostra quem sobe, quem cai, quem fica igual, a primeira medição e um ponto sem leitura", () => {
  const clientes = agruparPorCliente(rankingDemonstracao(idDe, "2026-11-26"));
  const palavras = clientes.flatMap((c) => c.palavras);
  const sentidos = palavras.map((p) => (p.mudanca === null ? "primeira" : p.mudanca.comparavel ? p.mudanca.sentido : "nao-compara"));
  assert.ok(sentidos.includes("subiu"), sentidos.join());
  assert.ok(sentidos.includes("caiu"), sentidos.join());
  assert.ok(sentidos.includes("igual"), sentidos.join());
  assert.ok(sentidos.includes("primeira"), sentidos.join());
  assert.ok(!sentidos.includes("nao-compara"), sentidos.join());
  assert.ok(palavras.some((p) => p.atual.posicoes.includes(null)));
  assert.ok(palavras.some((p) => p.atual.posicoes.includes(21)), "deve ter ponto fora do top 20");
  assert.ok(palavras.some((p) => p.atual.grade === 7), "deve ter uma grade maior");
});

test("rankingDemonstracao: a palavra com histórico completo tem 3 medições", () => {
  const grupos = agruparPorPalavra(rankingDemonstracao(idDe, "2026-11-26").filter((m) => m.palavra === "dentista londrina"));
  assert.equal(grupos[0].historico.length, 3);
});
