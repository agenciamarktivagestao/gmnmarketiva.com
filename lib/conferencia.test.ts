import { test } from "node:test";
import assert from "node:assert/strict";
import { contarConferencia, estadoConferencia } from "./conferencia.ts";

const e = (tipo: string, extra: { ok?: boolean; conferido_em?: string | null } = {}) => ({
  tipo,
  ok: true,
  conferido_em: null as string | null,
  ...extra,
});

test("ação que mexeu no Google e foi relida aparece como conferida", () => {
  assert.equal(estadoConferencia(e("post", { conferido_em: "2026-11-19T18:40:00Z" })), "conferido");
});

test("ação que mexeu no Google e ninguém releu ainda falta conferir", () => {
  for (const tipo of ["foto", "servico", "categoria", "resposta", "post", "area", "descricao"]) {
    assert.equal(estadoConferencia(e(tipo)), "falta", tipo);
  }
});

test("tipo novo que a rotina passar a registrar já nasce como falta conferir", () => {
  assert.equal(estadoConferencia(e("horario")), "falta");
});

test("decisão, análise e anotação não têm o que conferir", () => {
  for (const tipo of ["decisao", "analise", "outro"]) {
    assert.equal(estadoConferencia(e(tipo)), null, tipo);
    assert.equal(estadoConferencia(e(tipo, { conferido_em: "2026-11-19T18:40:00Z" })), null, tipo);
  }
});

test("ação que falhou não chegou ao Google: não há o que conferir", () => {
  assert.equal(estadoConferencia(e("post", { ok: false })), null);
});

test("contagem separa conferidas, faltam e ignora o que não se aplica", () => {
  const r = contarConferencia([
    e("post", { conferido_em: "2026-11-19T18:40:00Z" }),
    e("resposta", { conferido_em: "2026-11-19T18:40:00Z" }),
    e("foto"),
    e("decisao"),
    e("servico", { ok: false }),
  ]);
  assert.deepEqual(r, { conferidas: 2, faltam: 1 });
});

test("lista vazia não conta nada", () => {
  assert.deepEqual(contarConferencia([]), { conferidas: 0, faltam: 0 });
});
