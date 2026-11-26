import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agruparPorDia,
  comparar,
  diaCurto,
  diasEntre,
  fraseDaVariacao,
  janela,
  janelasPossiveis,
  linhaDoCliente,
  marcasDasAcoes,
  mediaMovel,
  origensDasAparicoes,
  podeComparar,
  reputacaoMaisRecente,
  resumirTermos,
  serieDiaria,
  somar,
  somarDiasNaData,
  somarTotais,
  ultimoDiaComDado,
  variacao,
} from "./desempenho.ts";
import type { DiaDesempenho } from "./desempenho.ts";

const dia = (d: string, extra: Partial<DiaDesempenho> = {}): DiaDesempenho => ({
  dia: d,
  maps_pc: 0,
  busca_pc: 0,
  maps_cel: 0,
  busca_cel: 0,
  ligacoes: 0,
  cliques_site: 0,
  rotas: 0,
  reservas: 0,
  ...extra,
});

// n dias seguidos terminando em `ate`, cada um com `busca_cel` = valor
const dias = (ate: string, n: number, valor = 1, extra: Partial<DiaDesempenho> = {}) =>
  Array.from({ length: n }, (_, i) => dia(somarDiasNaData(ate, -(n - 1 - i)), { busca_cel: valor, ...extra }));

test("somar junta as quatro origens em aparições e os quatro contatos em contatos", () => {
  const t = somar([
    dia("2026-11-01", { maps_pc: 1, busca_pc: 2, maps_cel: 3, busca_cel: 4, ligacoes: 5, cliques_site: 6, rotas: 7, reservas: 8 }),
    dia("2026-11-02", { busca_cel: 10, rotas: 1 }),
  ]);
  assert.equal(t.aparicoes, 20);
  assert.equal(t.contatos, 27);
  assert.equal(t.busca_cel, 14);
  assert.equal(t.rotas, 8);
});

test("somar sem dias dá tudo zero", () => {
  assert.deepEqual(Object.values(somar([])), Array(10).fill(0));
});

test("somarTotais soma vários clientes", () => {
  const a = somar([dia("2026-11-01", { busca_cel: 3, ligacoes: 1 })]);
  const b = somar([dia("2026-11-01", { maps_pc: 2, rotas: 4 })]);
  const t = somarTotais([a, b]);
  assert.equal(t.aparicoes, 5);
  assert.equal(t.contatos, 5);
});

test("datas viram o mês e o ano sem erro de fuso", () => {
  assert.equal(somarDiasNaData("2026-11-01", -1), "2026-10-31");
  assert.equal(somarDiasNaData("2026-12-31", 1), "2027-01-01");
  assert.equal(somarDiasNaData("2028-02-28", 1), "2028-02-29");
  assert.equal(diasEntre("2026-10-28", "2026-11-23"), 26);
  assert.equal(diaCurto("2026-11-03"), "03/11");
});

test("a janela de 7 dias tem 7 dias e termina no último dia", () => {
  const j = janela(dias("2026-11-23", 27), "2026-11-23", 7);
  assert.equal(j.de, "2026-11-17");
  assert.equal(j.ate, "2026-11-23");
  assert.equal(j.diasComDado, 7);
  assert.equal(j.completa, true);
  assert.equal(j.totais.aparicoes, 7);
});

test("janela com buraco não é completa", () => {
  const lista = dias("2026-11-23", 27).filter((d) => d.dia !== "2026-11-20");
  const j = janela(lista, "2026-11-23", 7);
  assert.equal(j.diasComDado, 6);
  assert.equal(j.completa, false);
});

test("comparar põe os 7 dias atuais contra os 7 anteriores, sem sobrepor", () => {
  const lista = [...dias("2026-11-16", 7, 10), ...dias("2026-11-23", 7, 15)];
  const c = comparar(lista, "2026-11-23");
  assert.equal(c.atual.totais.aparicoes, 105);
  assert.equal(c.anterior.totais.aparicoes, 70);
  assert.equal(c.anterior.ate, "2026-11-16");
  assert.equal(podeComparar(c), true);
});

test("sem a semana anterior inteira não dá para comparar", () => {
  const c = comparar(dias("2026-11-23", 10), "2026-11-23");
  assert.equal(c.atual.completa, true);
  assert.equal(c.anterior.completa, false);
  assert.equal(podeComparar(c), false);
});

test("variação: subiu, caiu e igual", () => {
  assert.deepEqual(variacao(150, 100), { delta: 50, pct: 50, sentido: "subiu" });
  assert.deepEqual(variacao(80, 100), { delta: -20, pct: -20, sentido: "caiu" });
  assert.equal(variacao(100, 100).sentido, "igual");
});

test("variação minúscula conta como igual, não como 0%", () => {
  assert.equal(variacao(1001, 1000).sentido, "igual");
});

test("base pequena não vira percentual: de 4 para 8 é 'subiu 4', não 'subiu 100%'", () => {
  const v = variacao(8, 4);
  assert.equal(v.pct, null);
  assert.equal(v.delta, 4);
  assert.equal(v.sentido, "subiu");
  assert.equal(fraseDaVariacao(v, "em relação aos 7 dias anteriores"), "subiu 4 em relação aos 7 dias anteriores");
});

test("frases da variação", () => {
  assert.equal(fraseDaVariacao(variacao(150, 100), "em relação à semana anterior"), "subiu 50% em relação à semana anterior");
  assert.equal(fraseDaVariacao(variacao(80, 100), "em relação à semana anterior"), "caiu 20% em relação à semana anterior");
  assert.equal(fraseDaVariacao(variacao(100, 100), "em relação à semana anterior"), "igual em relação à semana anterior");
});

test("de zero para qualquer coisa não divide por zero", () => {
  const v = variacao(5, 0);
  assert.equal(v.pct, null);
  assert.equal(v.sentido, "subiu");
});

test("último dia com número e janelas possíveis", () => {
  const lista = dias("2026-11-23", 27);
  assert.equal(ultimoDiaComDado(lista), "2026-11-23");
  assert.equal(ultimoDiaComDado([]), null);
  assert.deepEqual(janelasPossiveis(lista), [7]); // 27 dias: 7 cabe duas vezes (14), 14 não (28)
  assert.deepEqual(janelasPossiveis(dias("2026-11-23", 28)), [7, 14]);
  assert.deepEqual(janelasPossiveis(dias("2026-11-23", 56)), [7, 14, 28]);
  assert.deepEqual(janelasPossiveis([]), []);
  assert.deepEqual(janelasPossiveis(dias("2026-11-23", 13)), []);
});

test("série diária deixa buraco como null e não como zero", () => {
  const lista = [dia("2026-11-01", { busca_cel: 5 }), dia("2026-11-03", { busca_cel: 7 })];
  const s = serieDiaria(lista, "2026-11-01", "2026-11-04", (d) => d.busca_cel);
  assert.deepEqual(
    s.map((p) => p.valor),
    [5, null, 7, null],
  );
  assert.equal(s.length, 4);
});

test("média móvel só aparece com os 7 dias completos", () => {
  const s = serieDiaria(dias("2026-11-10", 10, 4), "2026-11-01", "2026-11-10", (d) => d.busca_cel);
  const m = mediaMovel(s);
  assert.deepEqual(m.slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(m[6], 4);
  assert.equal(m[9], 4);
});

test("média móvel não atravessa um dia sem número", () => {
  const lista = dias("2026-11-10", 10, 4).filter((d) => d.dia !== "2026-11-05");
  const s = serieDiaria(lista, "2026-11-01", "2026-11-10", (d) => d.busca_cel);
  const m = mediaMovel(s);
  assert.equal(m[6], null); // janela de 01 a 07 inclui o 05
  assert.equal(m[8], null);
  assert.equal(m[9], null); // 04 a 10 ainda inclui o 05
});

test("origens ordenadas do que mais para o que menos aparece", () => {
  const t = somar([dia("2026-11-01", { maps_pc: 1, busca_pc: 2, maps_cel: 3, busca_cel: 4 })]);
  assert.deepEqual(
    origensDasAparicoes(t).map((o) => o.chave),
    ["busca_cel", "maps_cel", "busca_pc", "maps_pc"],
  );
});

test("termos: os com número vêm do mais buscado, e os 'menos que 15' são só contados", () => {
  const t = (termo: string, usuarios: number | null, mes = "2026-10-01") => ({
    cliente_id: "c1",
    mes,
    termo,
    usuarios,
    abaixo_de: usuarios === null ? 15 : null,
  });
  const r = resumirTermos([t("dentista", null), t("dentista londrina", 82), t("clinica central", 21), t("implante", null), t("antigo", 99, "2026-09-01")])!;
  assert.equal(r.mes, "2026-10-01");
  assert.deepEqual(r.comNumero, [
    { termo: "dentista londrina", usuarios: 82 },
    { termo: "clinica central", usuarios: 21 },
  ]);
  assert.equal(r.abaixoDoLimite, 2);
  assert.deepEqual(r.poucos, ["dentista", "implante"]);
  assert.equal(r.limite, 15);
  assert.equal(r.total, 4);
});

test("termos: empate no número desempata pelo nome e mês pedido vale", () => {
  const t = (termo: string, usuarios: number, mes: string) => ({ cliente_id: "c1", mes, termo, usuarios, abaixo_de: null });
  const r = resumirTermos([t("b", 5, "2026-09-01"), t("a", 5, "2026-09-01"), t("z", 50, "2026-10-01")], "2026-09-01")!;
  assert.deepEqual(
    r.comNumero.map((x) => x.termo),
    ["a", "b"],
  );
});

test("termos: sem dados ou mês inexistente dá null", () => {
  assert.equal(resumirTermos([]), null);
  assert.equal(resumirTermos([{ cliente_id: "c", mes: "2026-10-01", termo: "x", usuarios: 1, abaixo_de: null }], "2026-08-01"), null);
});

test("marcas: agrupa por dia, ignora falha e o que não muda o perfil", () => {
  const diaDe = (i: string) => i.slice(0, 10);
  const marcas = marcasDasAcoes(
    [
      { ocorreu_em: "2026-11-20T05:40:00Z", tipo: "descricao", ok: true },
      { ocorreu_em: "2026-11-20T05:41:00Z", tipo: "servico", ok: true },
      { ocorreu_em: "2026-11-20T05:42:00Z", tipo: "servico", ok: true },
      { ocorreu_em: "2026-11-20T05:43:00Z", tipo: "foto", ok: false },
      { ocorreu_em: "2026-11-20T05:44:00Z", tipo: "decisao", ok: true },
      { ocorreu_em: "2026-11-18T05:44:00Z", tipo: "analise", ok: true },
      { ocorreu_em: "2026-11-19T05:44:00Z", tipo: "resposta", ok: true },
    ],
    diaDe,
  );
  assert.deepEqual(marcas, [
    { dia: "2026-11-19", n: 1, tipos: ["resposta"] },
    { dia: "2026-11-20", n: 3, tipos: ["descricao", "servico"] },
  ]);
});

test("marcas: o dia vem da função recebida (horário de Brasília), não do texto do instante", () => {
  const diaDe = () => "2026-11-19"; // 02:40 em Brasília cai em 05:40 UTC do mesmo dia; aqui só provamos que usa a função
  const marcas = marcasDasAcoes([{ ocorreu_em: "2026-11-20T01:00:00Z", tipo: "post", ok: true }], diaDe);
  assert.equal(marcas[0].dia, "2026-11-19");
});

test("reputação: vale a leitura mais recente de cada cliente", () => {
  const m = reputacaoMaisRecente([
    { cliente_id: "a", dia: "2026-11-10", nota: 4.5, total_avaliacoes: 10 },
    { cliente_id: "a", dia: "2026-11-20", nota: 4.7, total_avaliacoes: 12 },
    { cliente_id: "b", dia: "2026-11-05", nota: null, total_avaliacoes: 0 },
  ]);
  assert.equal(m.get("a")?.nota, 4.7);
  assert.equal(m.get("b")?.total_avaliacoes, 0);
  assert.equal(m.size, 2);
});

test("linha do cliente: compara quando as duas janelas estão completas", () => {
  const lista = [...dias("2026-11-16", 7, 10, { ligacoes: 1 }), ...dias("2026-11-23", 7, 20, { ligacoes: 2 })];
  const l = linhaDoCliente("c1", lista, "2026-11-23");
  assert.equal(l.semDados, false);
  assert.equal(l.incompleta, false);
  assert.equal(l.aparicoes?.sentido, "subiu");
  assert.equal(l.aparicoes?.pct, 100);
  assert.equal(l.contatos?.delta, 7);
});

test("linha do cliente: sem nenhum número na janela fica como sem dados", () => {
  const l = linhaDoCliente("c1", dias("2026-11-01", 20), "2026-11-23");
  assert.equal(l.semDados, true);
  assert.equal(l.aparicoes, null);
});

test("linha do cliente: janela pela metade avisa que está incompleta e não compara", () => {
  const l = linhaDoCliente("c1", dias("2026-11-23", 3), "2026-11-23");
  assert.equal(l.semDados, false);
  assert.equal(l.incompleta, true);
  assert.equal(l.aparicoes, null);
});

test("agrupar por dia soma os clientes que têm número no mesmo dia", () => {
  const g = agruparPorDia([
    dia("2026-11-02", { busca_cel: 4, ligacoes: 1 }),
    dia("2026-11-01", { busca_cel: 1 }),
    dia("2026-11-02", { busca_cel: 6, ligacoes: 2, rotas: 3 }),
  ]);
  assert.deepEqual(
    g.map((d) => d.dia),
    ["2026-11-01", "2026-11-02"],
  );
  assert.equal(g[1].busca_cel, 10);
  assert.equal(g[1].ligacoes, 3);
  assert.equal(g[1].rotas, 3);
});

test("agrupar por dia não altera a lista original", () => {
  const original = [dia("2026-11-02", { busca_cel: 4 }), dia("2026-11-02", { busca_cel: 6 })];
  agruparPorDia(original);
  assert.equal(original[0].busca_cel, 4);
});
