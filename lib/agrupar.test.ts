import assert from "node:assert/strict";
import test from "node:test";
import { agrupar } from "./agrupar.ts";

const p = (id: string, titulo: string, extra: Record<string, unknown> = {}) =>
  ({ id, titulo, quem: "voce", status: "aberta", prioridade: "media", cliente_id: id, comentarios: [], ...extra }) as never;

test("agrupa títulos iguais e mantém a ordem pelo primeiro item", () => {
  const lista = [p("1", "Capa vertical"), p("2", "Outra coisa"), p("3", "capa vertical"), p("4", "Capa vertical")];
  const r = agrupar(lista);
  assert.equal(r.length, 2);
  assert.equal(r[0].tipo, "grupo");
  assert.equal(r[0].tipo === "grupo" && r[0].itens.length, 3);
  assert.equal(r[1].tipo, "item");
});

test("não junta pendências de quem resolve, status ou tipo diferentes", () => {
  const lista = [
    p("1", "Área de atendimento vazia", { quem: "eu" }),
    p("2", "Área de atendimento vazia", { quem: "voce" }),
    p("3", "Área de atendimento vazia", { quem: "voce", status: "aprovada" }),
    p("4", "Área de atendimento vazia", { quem: "voce", kind: "input" }),
  ];
  assert.ok(agrupar(lista).every((e) => e.tipo === "item"));
});

test("pendência sem kind conta como approve", () => {
  const r = agrupar([p("1", "X"), p("2", "X", { kind: "approve" })]);
  assert.equal(r.length, 1);
  assert.equal(r[0].tipo, "grupo");
});

test("pendência com avaliações nunca entra em grupo", () => {
  const av = { avaliacoes: [{ review_id: "r1" }] };
  const r = agrupar([p("1", "Avaliação sem resposta", { payload: av }), p("2", "Avaliação sem resposta", { payload: av }), p("3", "Avaliação sem resposta")]);
  assert.ok(r.every((e) => e.tipo === "item"));
});
