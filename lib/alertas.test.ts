import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_AVALIACOES_RUINS, MAX_FALHAS, calcularAtencao, nadaPedeAtencao } from "./alertas.ts";
import { montarSemana } from "./semana.ts";

const evento = (
  id: string,
  quando: string,
  extra: Partial<{ cliente_id: string | null; tipo: string; origem: string; ok: boolean }> = {},
) => ({
  id,
  cliente_id: "c1" as string | null,
  tipo: "post",
  resumo: `Ação ${id}`,
  detalhe: null,
  origem: "rotina",
  ok: true,
  ocorreu_em: quando,
  conferido_em: null as string | null,
  ...extra,
});

// Quarta-feira, 18/11/2026. A janela vai de 12/11 a 18/11.
const AGORA = "2026-11-18T13:00:00Z";
const entrada = (eventos: ReturnType<typeof evento>[], extra: Partial<Parameters<typeof calcularAtencao>[0]> = {}) => ({
  semana: montarSemana(eventos, AGORA),
  clienteIds: ["c1"],
  rotinaAtiva: true,
  passouDoPrazo: true,
  ...extra,
});

const HOJE = "2026-11-18T05:30:00Z"; // 02:30 de quarta em Brasília
const ONTEM = "2026-11-17T05:30:00Z";
const ANTEONTEM = "2026-11-16T05:30:00Z";

test("rotina que registrou hoje não gera alerta", () => {
  assert.equal(calcularAtencao(entrada([evento("a", HOJE)])).rotina, null);
});

test("antes do prazo, basta a noite de ontem; depois dele, a de hoje é obrigatória", () => {
  assert.equal(calcularAtencao(entrada([evento("a", ONTEM)], { passouDoPrazo: false })).rotina, null);
  const depois = calcularAtencao(entrada([evento("a", ONTEM)], { passouDoPrazo: true })).rotina;
  assert.equal(depois?.noites, 1);
  assert.equal(depois?.ultima, ONTEM);
});

test("conta quantas noites a rotina ficou sem registrar", () => {
  assert.equal(calcularAtencao(entrada([evento("a", ANTEONTEM)], { passouDoPrazo: true })).rotina?.noites, 2);
  assert.equal(calcularAtencao(entrada([evento("a", ANTEONTEM)], { passouDoPrazo: false })).rotina?.noites, 1);
});

test("sem nenhum registro da rotina na semana, o alerta vale e não há última vez", () => {
  const r = calcularAtencao(entrada([])).rotina;
  assert.equal(r?.ultima, null);
  assert.equal(r?.noites, 7);
});

test("ação da equipe ou análise não contam como a rotina ter rodado", () => {
  const a = calcularAtencao(entrada([evento("a", HOJE, { origem: "equipe" }), evento("b", HOJE, { origem: "analise" })]));
  assert.equal(a.rotina?.noites, 7);
});

test("rotina pausada de propósito não gera alerta de rotina parada", () => {
  assert.equal(calcularAtencao(entrada([], { rotinaAtiva: false })).rotina, null);
});

test("falhas: só as dos últimos 3 dias, só as que falharam, da mais recente para a mais antiga", () => {
  const a = calcularAtencao(
    entrada([
      evento("velha", "2026-11-14T05:00:00Z", { ok: false }), // fora dos 3 dias
      evento("f1", "2026-11-16T05:00:00Z", { ok: false }),
      evento("f2", "2026-11-18T05:00:00Z", { ok: false }),
      evento("f3", "2026-11-17T05:00:00Z", { ok: false }),
      evento("boa", "2026-11-18T05:10:00Z"),
    ]),
  );
  assert.equal(a.falhas.total, 3);
  assert.deepEqual(
    a.falhas.recentes.map((e) => e.id),
    ["f2", "f3", "f1"],
  );
});

test("a lista de falhas é cortada, mas o total é completo", () => {
  const muitas = Array.from({ length: MAX_FALHAS + 3 }, (_, i) =>
    evento(`f${i}`, `2026-11-18T05:${String(10 + i).padStart(2, "0")}:00Z`, { ok: false }),
  );
  const a = calcularAtencao(entrada(muitas));
  assert.equal(a.falhas.total, MAX_FALHAS + 3);
  assert.equal(a.falhas.recentes.length, MAX_FALHAS);
});

test("clientes sem ação: aparecem os que ficaram de fora e somem os pausados", () => {
  const eventos = [evento("a", HOJE, { cliente_id: "c1" })];
  const base = { clienteIds: ["c1", "c2", "c3"] };
  assert.deepEqual(calcularAtencao(entrada(eventos, base)).semAcao, ["c2", "c3"]);
  assert.deepEqual(calcularAtencao(entrada(eventos, { ...base, pausados: new Set(["c2"]) })).semAcao, ["c3"]);
});

test("uma ação que falhou ainda conta como o cliente ter sido atendido na semana", () => {
  const a = calcularAtencao(entrada([evento("a", HOJE, { cliente_id: "c1", ok: false })]));
  assert.deepEqual(a.semAcao, []);
});

test("tudo em ordem: nada pede atenção", () => {
  const a = calcularAtencao(entrada([evento("a", HOJE, { cliente_id: "c1" })]));
  assert.equal(nadaPedeAtencao(a), true);
  assert.equal(nadaPedeAtencao(calcularAtencao(entrada([]))), false);
});

const ruim = (id: string, estrelas = 1) => ({
  id,
  cliente_id: "c1",
  review_id: `r-${id}`,
  avaliador: `Pessoa ${id}`,
  estrelas,
  texto: null,
  avaliada_em: "2026-11-17",
  motivo: "nota" as const,
  motivo_detalhe: null,
  situacao: "nova" as const,
  detectada_em: "2026-11-18T05:40:00Z",
  tratada_em: null,
  tratada_por: null,
  desfecho: null,
});

test("avaliação ruim sem tratar pede atenção, mesmo com a rotina em dia", () => {
  const a = calcularAtencao(entrada([evento("a", HOJE)], { avaliacoesRuins: [ruim("x")] }));
  assert.equal(a.avaliacoesRuins.total, 1);
  assert.equal(nadaPedeAtencao(a), false);
});

test("sem alerta de avaliação, o total é zero", () => {
  assert.deepEqual(calcularAtencao(entrada([evento("a", HOJE)])).avaliacoesRuins, { total: 0, recentes: [] });
});

test("só as primeiras avaliações ruins são listadas, mas o total conta todas", () => {
  const muitas = Array.from({ length: 8 }, (_, i) => ruim(`r${i}`));
  const a = calcularAtencao(entrada([evento("a", HOJE)], { avaliacoesRuins: muitas }));
  assert.equal(a.avaliacoesRuins.total, 8);
  assert.equal(a.avaliacoesRuins.recentes.length, MAX_AVALIACOES_RUINS);
});
