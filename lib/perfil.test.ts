import assert from "node:assert/strict";
import { test } from "node:test";
import { capaDe, dataBR, formatarHora, limparComentario, linkRota, linkTelefone, normalizarPerfil, notaBR, resumoHorario } from "./perfil.ts";
import type { Periodo } from "./perfil.ts";

const semana = (abre: string, fecha: string, dias: Periodo["dia"][]): Periodo[] => dias.map((dia) => ({ dia, abre, fecha }));

test("horas no jeito brasileiro", () => {
  assert.equal(formatarHora("09:00"), "9h");
  assert.equal(formatarHora("13:30"), "13h30");
  assert.equal(formatarHora("18:00"), "18h");
});

test("horário junta dias seguidos iguais e mostra o fechado", () => {
  const p = [...semana("09:00", "18:00", ["seg", "ter", "qua", "qui", "sex"]), ...semana("09:00", "13:00", ["sab"])];
  assert.deepEqual(resumoHorario(p), [
    { dias: "Segunda a sexta", horas: "9h–18h" },
    { dias: "Sábado", horas: "9h–13h" },
    { dias: "Domingo", horas: "Fechado" },
  ]);
});

test("horário: sábado e domingo fechados viram um trecho só; dois dias usam 'e'", () => {
  const p = semana("09:00", "19:00", ["seg", "ter", "qua", "qui", "sex"]);
  assert.deepEqual(resumoHorario(p).at(-1), { dias: "Sábado e domingo", horas: "Fechado" });
});

test("horário com intervalo de almoço e aberto 24 horas", () => {
  const manha = semana("08:00", "12:00", ["seg", "ter", "qua", "qui", "sex"]);
  const tarde = semana("13:30", "18:00", ["seg", "ter", "qua", "qui", "sex"]);
  assert.equal(resumoHorario([...tarde, ...manha])[0].horas, "8h–12h e 13h30–18h");
  const todos = semana("00:00", "24:00", ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]);
  assert.deepEqual(resumoHorario(todos), [{ dias: "Todos os dias", horas: "24 horas" }]);
  assert.deepEqual(resumoHorario([]), []);
});

test("data sem passar por fuso", () => {
  assert.equal(dataBR("2026-11-14"), "14/11/2026");
  assert.equal(dataBR("2026-11-14T02:00:00Z"), "14/11/2026");
  assert.equal(dataBR("sem data"), "sem data");
  assert.equal(notaBR(4.9), "4,9");
  assert.equal(notaBR(5), "5,0");
});

test("comentário sem a tradução automática do Google", () => {
  assert.equal(limparComentario("Ótima  (Translated by Google) Excellent"), "Ótima");
  assert.equal(limparComentario("(Translated by Google) Great place\n\n(Original)\nÓtimo lugar"), "Ótimo lugar");
  assert.equal(limparComentario("  Atendimento rápido  "), "Atendimento rápido");
});

test("links de ligar e de rota", () => {
  assert.equal(linkTelefone("(43) 99106-3343"), "tel:+5543991063343");
  assert.equal(linkTelefone("(43) 3337-1313"), "tel:+554333371313");
  assert.equal(linkTelefone(null), null);
  assert.equal(linkTelefone("123"), null);
  assert.equal(linkRota({ titulo: "X", endereco: "Rua A, 1", mapa: "https://maps.google.com/?cid=1" }), "https://maps.google.com/?cid=1");
  assert.match(linkRota({ titulo: "Loja", endereco: "Rua A, 1", mapa: null }) ?? "", /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Loja%2C%20Rua%20A%2C%201$/);
});

test("lê perfil incompleto ou estragado sem quebrar", () => {
  const vazio = normalizarPerfil(null);
  assert.equal(vazio.titulo, "");
  assert.deepEqual(vazio.fotos, []);
  assert.equal(vazio.nota, null);
  const d = normalizarPerfil({
    titulo: "Loja",
    nota: "4,9",
    horario: [{ dia: "seg", abre: "09:00", fecha: "18:00" }, { dia: "xxx", abre: "1", fecha: "2" }, "lixo"],
    fotos: [{ url: "javascript:alert(1)" }, { url: "https://lh3.googleusercontent.com/a=s300", categoria: "capa", largura: 10, altura: 20 }],
    links: { instagram: "https://instagram.com/x", ruim: "javascript:x" },
    avaliacoes: [{ id: "1", autor: "", estrelas: 9, texto: "Boa (Translated by Google) Good", data: "2026-11-01", resposta: " " }],
  });
  assert.equal(d.nota, null);
  assert.equal(d.horario.length, 1);
  assert.equal(d.fotos.length, 1);
  assert.deepEqual(d.links, { instagram: "https://instagram.com/x" });
  assert.equal(d.avaliacoes[0].autor, "Anônimo");
  assert.equal(d.avaliacoes[0].estrelas, 5);
  assert.equal(d.avaliacoes[0].texto, "Boa");
  assert.equal(d.avaliacoes[0].resposta, null);
});

test("capa: a foto marcada como capa, senão a primeira", () => {
  const f = (categoria: "capa" | "foto", url: string) => ({ url, categoria, largura: 1, altura: 1, criada_em: "" });
  assert.equal(capaDe([f("foto", "a"), f("capa", "b")])?.url, "b");
  assert.equal(capaDe([f("foto", "a"), f("foto", "b")])?.url, "a");
  assert.equal(capaDe([]), null);
});
