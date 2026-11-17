import assert from "node:assert/strict";
import { test } from "node:test";
import { contarNovas, ehNova, linkDoCommit, normalizarMudancas } from "./mudancas.ts";

test("sem registro de visto, tudo é novidade", () => {
  assert.equal(ehNova("2026-11-17T10:00:00Z", null), true);
  assert.equal(contarNovas([{ feito_em: "2026-11-17T10:00:00Z" }, { feito_em: "2026-11-16T10:00:00Z" }], null), 2);
});

test("só conta o que foi feito depois da última visita", () => {
  const visto = "2026-11-17T12:00:00Z";
  assert.equal(ehNova("2026-11-17T12:00:00Z", visto), false); // no mesmo instante: já visto
  assert.equal(ehNova("2026-11-17T12:00:01Z", visto), true);
  assert.equal(contarNovas([{ feito_em: "2026-11-17T13:00:00Z" }, { feito_em: "2026-11-17T11:00:00Z" }], visto), 1);
});

test("o horário vale com fuso: 15h em Brasília é 18h em UTC", () => {
  assert.equal(ehNova("2026-11-17T15:30:00-03:00", "2026-11-17T18:00:00Z"), true);
  assert.equal(ehNova("2026-11-17T14:30:00-03:00", "2026-11-17T18:00:00Z"), false);
});

test("link do commit só para um hash de verdade", () => {
  assert.equal(linkDoCommit("7e506d2"), "https://github.com/agenciamarktivagestao/gmnmarketiva.com/commit/7e506d2");
  assert.equal(linkDoCommit(null), null);
  assert.equal(linkDoCommit("main; rm -rf"), null);
  assert.equal(linkDoCommit("abc"), null);
});

test("leitura tolerante: campos faltando, tipo desconhecido, mais recente primeiro", () => {
  const lista = normalizarMudancas([
    { id: "a", titulo: "Antiga", resumo: "r", feito_em: "2026-11-16T10:00:00Z", itens: ["um", 3, ""], tipo: "outro" },
    { titulo: "Nova", resumo: "r", feito_em: "2026-11-17T10:00:00Z", tipo: "dados", commit_sha: "  " },
    { titulo: "", resumo: "sem título", feito_em: "2026-11-17T10:00:00Z" },
    { titulo: "Sem data", resumo: "r", feito_em: "ontem" },
    null,
    "texto",
  ]);
  assert.deepEqual(lista.map((m) => m.titulo), ["Nova", "Antiga"]);
  assert.equal(lista[0].tipo, "dados");
  assert.equal(lista[0].commit_sha, null);
  assert.equal(lista[0].autor, "Claude");
  assert.deepEqual(lista[1].itens, ["um"]);
  assert.equal(lista[1].tipo, "painel");
  assert.deepEqual(normalizarMudancas("não é lista"), []);
});
