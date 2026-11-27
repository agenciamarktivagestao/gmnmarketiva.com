import assert from "node:assert/strict";
import { test } from "node:test";
import { LIMITE_DESFECHO, agruparPorCliente, contarPorNota, limparDesfecho, motivoRotulo, separarAlertas } from "./avaliacoes-ruins.ts";
import type { AlertaAvaliacao } from "./avaliacoes-ruins.ts";

const AGORA = "2026-11-27T12:00:00Z";

const alerta = (id: string, extra: Partial<AlertaAvaliacao> = {}): AlertaAvaliacao => ({
  id,
  cliente_id: "c1",
  review_id: `r-${id}`,
  avaliador: `Pessoa ${id}`,
  estrelas: 1,
  texto: null,
  avaliada_em: "2026-11-26",
  motivo: "nota",
  motivo_detalhe: null,
  situacao: "nova",
  detectada_em: "2026-11-27T05:40:00Z",
  tratada_em: null,
  tratada_por: null,
  desfecho: null,
  ...extra,
});

const cliente = (id: string, nome: string) => ({
  id,
  slug: id,
  nome,
  categoria: null,
  cidade: null,
  gbp_location: null,
  servicos_padrao: 0,
  ordem: 0,
});

test("as novas vêm da nota mais baixa para a mais alta e, na mesma nota, da mais recente", () => {
  const { novas } = separarAlertas(
    [
      alerta("a", { estrelas: 3 }),
      alerta("b", { estrelas: 1, detectada_em: "2026-11-25T05:40:00Z" }),
      alerta("c", { estrelas: 1, detectada_em: "2026-11-27T05:40:00Z" }),
    ],
    AGORA,
  );
  assert.deepEqual(
    novas.map((a) => a.id),
    ["c", "b", "a"],
  );
});

test("uma avaliação tratada fica na lista só por 30 dias", () => {
  const { novas, tratadas } = separarAlertas(
    [
      alerta("a", { situacao: "tratada", tratada_em: "2026-11-20T10:00:00Z" }),
      alerta("b", { situacao: "tratada", tratada_em: "2026-10-20T10:00:00Z" }),
      alerta("c"),
    ],
    AGORA,
  );
  assert.deepEqual(
    novas.map((a) => a.id),
    ["c"],
  );
  assert.deepEqual(
    tratadas.map((a) => a.id),
    ["a"],
  );
});

test("o agrupamento deixa de fora o cliente sem alerta e põe primeiro quem tem mais novas", () => {
  const clientes = [cliente("c1", "Zero a Sete"), cliente("c2", "Clínica"), cliente("c3", "Brava Motors")];
  const grupos = agruparPorCliente(
    [alerta("a", { cliente_id: "c2" }), alerta("b", { cliente_id: "c2" }), alerta("c", { cliente_id: "c1" })],
    clientes,
    AGORA,
  );
  assert.deepEqual(
    grupos.map((g) => g.cliente.nome),
    ["Clínica", "Zero a Sete"],
  );
  assert.equal(grupos[0].novas.length, 2);
});

test("empate de novas desempata pelo nome do cliente, em ordem alfabética do português", () => {
  const clientes = [cliente("c1", "Óticas Gouveia"), cliente("c2", "Aline"), cliente("c3", "Brava")];
  const grupos = agruparPorCliente(
    [alerta("a", { cliente_id: "c1" }), alerta("b", { cliente_id: "c2" }), alerta("c", { cliente_id: "c3" })],
    clientes,
    AGORA,
  );
  assert.deepEqual(
    grupos.map((g) => g.cliente.nome),
    ["Aline", "Brava", "Óticas Gouveia"],
  );
});

test("cliente que só tem alerta tratado antigo não aparece", () => {
  const grupos = agruparPorCliente([alerta("a", { situacao: "tratada", tratada_em: "2026-09-01T10:00:00Z" })], [cliente("c1", "X")], AGORA);
  assert.equal(grupos.length, 0);
});

test("a contagem por nota inclui as notas 4 e 5 de comentário negativo", () => {
  const porNota = contarPorNota([alerta("a", { estrelas: 1 }), alerta("b", { estrelas: 1 }), alerta("c", { estrelas: 5, motivo: "comentario" })]);
  assert.equal(porNota[1], 2);
  assert.equal(porNota[5], 1);
  assert.equal(porNota[3], 0);
});

test("o desfecho perde espaços sobrando e respeita o limite", () => {
  assert.equal(limparDesfecho("  Denunciada   ao\nGoogle  "), "Denunciada ao Google");
  assert.equal(limparDesfecho(null), "");
  assert.equal(limparDesfecho("a".repeat(500)).length, LIMITE_DESFECHO);
});

test("cada motivo tem um rótulo em português", () => {
  assert.equal(motivoRotulo("nota"), "Nota baixa");
  assert.equal(motivoRotulo("comentario"), "Comentário negativo");
  assert.equal(motivoRotulo("nota_e_comentario"), "Nota baixa e comentário negativo");
});
