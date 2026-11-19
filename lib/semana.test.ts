import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agruparDiaPorCliente,
  contarPorGrupo,
  diaChave,
  grupoDoTipo,
  inicioDaBusca,
  montarSemana,
  paraOCliente,
  periodoEmTexto,
  quandoFoi,
  resumirPorCliente,
  ultimosDias,
} from "./semana.ts";

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

// Quarta-feira, 18/11/2026, 10:00 em Brasília
const AGORA = "2026-11-18T13:00:00Z";

test("o dia vale no horário de Brasília, não em UTC", () => {
  assert.equal(diaChave("2026-11-18T02:30:00Z"), "2026-11-17"); // 23:30 de terça em Brasília
  assert.equal(diaChave("2026-11-18T03:00:00Z"), "2026-11-18"); // meia-noite em Brasília
  assert.equal(diaChave("2026-11-18T05:37:00Z"), "2026-11-18"); // a rotina das 02:37 é do mesmo dia
});

test("sete dias, do mais antigo até hoje", () => {
  const dias = ultimosDias(AGORA);
  assert.equal(dias.length, 7);
  assert.deepEqual(
    dias.map((d) => d.chave),
    ["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"],
  );
  assert.equal(dias.at(-1)?.hoje, true);
  assert.equal(dias.filter((d) => d.hoje).length, 1);
  assert.equal(dias.at(-1)?.curto, "qua");
  assert.equal(dias.at(-1)?.numero, "18");
  assert.equal(dias.at(-1)?.longo, "quarta-feira, 18 de novembro");
  assert.equal(dias[0].curto, "qui");
});

test("a janela atravessa a virada de mês e de ano", () => {
  assert.deepEqual(
    ultimosDias("2027-01-03T15:00:00Z").map((d) => d.chave),
    ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"],
  );
});

test("cada tipo do histórico cai em um grupo, e o desconhecido vai para decisões", () => {
  assert.equal(grupoDoTipo("foto"), "fotos");
  assert.equal(grupoDoTipo("servico"), "servicos");
  assert.equal(grupoDoTipo("post"), "postagens");
  assert.equal(grupoDoTipo("resposta"), "respostas");
  assert.equal(grupoDoTipo("area"), "perfil");
  assert.equal(grupoDoTipo("categoria"), "perfil");
  assert.equal(grupoDoTipo("descricao"), "perfil");
  assert.equal(grupoDoTipo("analise"), "decisoes");
  assert.equal(grupoDoTipo("qualquer-coisa"), "decisoes");
});

test("a semana ignora o que está fora da janela e conta o resto por dia e por grupo", () => {
  const eventos = [
    evento("velho", "2026-11-11T15:00:00Z"), // 11/11: fora
    evento("a", "2026-11-18T05:24:00Z"), // qua 18
    evento("b", "2026-11-18T05:25:00Z", { tipo: "foto" }),
    evento("c", "2026-11-18T02:30:00Z", { tipo: "servico" }), // ainda é terça 17 em Brasília
    evento("d", "2026-11-17T18:00:00Z", { origem: "equipe", tipo: "decisao" }),
    evento("e", "2026-11-17T06:00:00Z", { ok: false, tipo: "foto" }),
  ];
  const s = montarSemana(eventos, AGORA);
  assert.equal(s.total, 5);
  assert.equal(s.eventos.length, 5);
  assert.equal(s.totalPorDia["2026-11-18"], 2);
  assert.equal(s.totalPorDia["2026-11-17"], 3);
  assert.equal(s.celulas.postagens["2026-11-18"].n, 1);
  assert.equal(s.celulas.fotos["2026-11-18"].n, 1);
  assert.equal(s.celulas.servicos["2026-11-17"].n, 1);
  assert.equal(s.celulas.decisoes["2026-11-17"].n, 1);
  assert.deepEqual(s.celulas.fotos["2026-11-17"], { n: 1, falhas: 1 });
  assert.equal(s.falhas, 1);
  assert.equal(s.daRotina, 4);
  assert.equal(s.daEquipe, 1);
});

test("os eventos vêm do mais recente para o mais antigo, mesmo com formatos de data diferentes", () => {
  const s = montarSemana(
    [evento("antigo", "2026-11-17T05:00:00+00:00"), evento("novo", "2026-11-18T05:00:00.000Z"), evento("meio", "2026-11-17T20:00:00Z")],
    AGORA,
  );
  assert.deepEqual(
    s.eventos.map((e) => e.id),
    ["novo", "meio", "antigo"],
  );
  assert.equal(s.ultimaRotina, "2026-11-18T05:00:00.000Z");
  assert.deepEqual(
    s.porDia["2026-11-17"].map((e) => e.id),
    ["meio", "antigo"],
  );
});

test("semana sem nada registrado fica zerada e sem última rodada", () => {
  const s = montarSemana([], AGORA);
  assert.equal(s.total, 0);
  assert.equal(s.ultimaRotina, null);
  assert.equal(Object.keys(s.porDia).length, 7);
  assert.equal(s.celulas.fotos["2026-11-18"].n, 0);
});

test("a última rodada ignora ações da equipe", () => {
  const s = montarSemana([evento("r", "2026-11-17T05:00:00Z"), evento("e", "2026-11-18T12:00:00Z", { origem: "equipe" })], AGORA);
  assert.equal(s.ultimaRotina, "2026-11-17T05:00:00Z");
});

test("resumo por cliente: total, falhas, dias e a ação mais recente", () => {
  const s = montarSemana(
    [
      evento("1", "2026-11-18T05:00:00Z", { cliente_id: "c1" }),
      evento("2", "2026-11-17T05:00:00Z", { cliente_id: "c1", ok: false }),
      evento("3", "2026-11-17T06:00:00Z", { cliente_id: "c2" }),
      evento("4", "2026-11-16T06:00:00Z", { cliente_id: null, tipo: "analise", origem: "analise" }),
    ],
    AGORA,
  );
  const r = resumirPorCliente(s);
  assert.equal(r.c1.total, 2);
  assert.equal(r.c1.falhas, 1);
  assert.equal(r.c1.ultimo, "2026-11-18T05:00:00Z");
  assert.equal(r.c1.porDia["2026-11-18"], 1);
  assert.equal(r.c1.porDia["2026-11-17"], 1);
  assert.equal(r.c2.total, 1);
  assert.equal(r.geral.total, 1);
  assert.equal(r.c3, undefined);
});

test("o dia agrupado por cliente segue a ordem dos clientes e deixa o geral por último", () => {
  const lista = [
    evento("1", "2026-11-18T05:00:00Z", { cliente_id: "c2" }),
    evento("2", "2026-11-18T05:10:00Z", { cliente_id: null, tipo: "analise" }),
    evento("3", "2026-11-18T05:20:00Z", { cliente_id: "c1" }),
    evento("4", "2026-11-18T05:30:00Z", { cliente_id: "c2" }),
    evento("5", "2026-11-18T05:40:00Z", { cliente_id: "fora-da-lista" }),
  ];
  const grupos = agruparDiaPorCliente(lista, ["c1", "c2", "c3"]);
  assert.deepEqual(
    grupos.map((g) => g.clienteId),
    ["c1", "c2", "fora-da-lista", null],
  );
  assert.deepEqual(
    grupos[1].eventos.map((e) => e.id),
    ["1", "4"],
  );
});

test("quandoFoi diz hoje, ontem ou a data, sempre no horário de Brasília", () => {
  const dias = ultimosDias(AGORA);
  assert.equal(quandoFoi("2026-11-18T05:37:00Z", dias), "hoje, 02:37");
  assert.equal(quandoFoi("2026-11-17T05:37:00Z", dias), "ontem, 02:37");
  assert.equal(quandoFoi("2026-11-14T06:10:00Z", dias), "14/11, 03:10");
  assert.equal(quandoFoi("2026-11-18T02:30:00Z", dias), "ontem, 23:30"); // ainda é terça em Brasília
});

test("a busca começa um dia antes da janela, para não perder o começo do primeiro dia", () => {
  const desde = inicioDaBusca(new Date(AGORA));
  assert.equal(desde, "2026-11-10T13:00:00.000Z");
  assert.ok(desde < "2026-11-12T03:00:00Z"); // o primeiro dia da janela é 12/11, que começa às 03:00 UTC
});

const evRel = (id: string, tipo: string, extra: Partial<{ ok: boolean; origem: string }> = {}) => ({
  id,
  cliente_id: "c1" as string | null,
  tipo,
  resumo: `Ação ${id}`,
  detalhe: null,
  origem: "rotina",
  ok: true,
  ocorreu_em: "2026-11-18T05:00:00Z",
  conferido_em: null as string | null,
  ...extra,
});

test("o relatório do cliente tira o que falhou e as anotações internas", () => {
  const lista = [
    evRel("1", "post"),
    evRel("2", "post", { ok: false }),
    evRel("3", "decisao", { origem: "equipe" }),
    evRel("4", "analise"),
    evRel("5", "descricao", { origem: "equipe" }),
  ];
  assert.deepEqual(
    paraOCliente(lista).map((e) => e.id),
    ["1", "5"],
  );
});

test("o período aparece em texto, inclusive na virada de ano", () => {
  assert.equal(periodoEmTexto(ultimosDias("2026-11-18T13:00:00Z")), "12/11 a 18/11/2026");
  assert.equal(periodoEmTexto(ultimosDias("2027-01-03T13:00:00Z")), "28/12/2026 a 03/01/2027");
  assert.equal(periodoEmTexto([]), "");
});

test("a contagem por tipo traz os seis grupos, mesmo os zerados", () => {
  const c = contarPorGrupo([evRel("1", "post"), evRel("2", "post"), evRel("3", "foto"), evRel("4", "area")]);
  assert.equal(c.length, 6);
  assert.deepEqual(Object.fromEntries(c.map((x) => [x.chave, x.n])), {
    fotos: 1,
    servicos: 0,
    postagens: 2,
    respostas: 0,
    perfil: 1,
    decisoes: 0,
  });
});
