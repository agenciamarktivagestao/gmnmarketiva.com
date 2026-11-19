import assert from "node:assert/strict";
import { test } from "node:test";
import { TOKEN_DEMO, linkPublico, lerRespostaPublica, tokenComFormato } from "./acompanhamento.ts";

const resposta = (extra: Record<string, unknown> = {}) => ({
  gerado_em: "2026-11-18T13:00:00Z",
  cliente: { nome: "Ótica Exemplo", categoria: "Ótica", cidade: "Londrina" },
  eventos: [
    { id: "e1", tipo: "post", resumo: "Postagem publicada sobre óculos de grau", ocorreu_em: "2026-11-18T05:20:00Z" },
    { id: "e2", tipo: "foto", resumo: "3 fotos novas na galeria", ocorreu_em: "2026-11-17T05:10:00Z" },
  ],
  diagnostico: { lido_em: "2026-11-16", impressoes: 1200, ligacoes: 14, rotas: 9, cliques_site: 31 },
  ...extra,
});

test("o token só vale com 32 a 128 letras, números, hífen e sublinhado", () => {
  assert.equal(tokenComFormato("a".repeat(43)), true);
  assert.equal(tokenComFormato("A-b_" + "c".repeat(30)), true);
  assert.equal(tokenComFormato("a".repeat(31)), false);
  assert.equal(tokenComFormato("a".repeat(129)), false);
  assert.equal(tokenComFormato("a".repeat(40) + "/"), false);
  assert.equal(tokenComFormato("a".repeat(40) + " "), false);
  assert.equal(tokenComFormato(""), false);
  assert.equal(tokenComFormato(TOKEN_DEMO), true);
});

test("o link público usa o endereço do painel, sem barras sobrando", () => {
  assert.equal(linkPublico("https://painel.exemplo.com", "abc"), "https://painel.exemplo.com/p/abc");
  assert.equal(linkPublico("https://painel.exemplo.com//", "abc"), "https://painel.exemplo.com/p/abc");
});

test("uma resposta completa vira o acompanhamento, com campos neutros no que o banco não manda", () => {
  const a = lerRespostaPublica(resposta());
  assert.ok(a);
  assert.equal(a.cliente.nome, "Ótica Exemplo");
  assert.equal(a.cliente.cidade, "Londrina");
  assert.equal(a.eventos.length, 2);
  assert.deepEqual(a.eventos[0], {
    id: "e1",
    cliente_id: null,
    tipo: "post",
    resumo: "Postagem publicada sobre óculos de grau",
    detalhe: null,
    origem: "publico",
    ok: true,
    ocorreu_em: "2026-11-18T05:20:00Z",
    conferido_em: null,
  });
  assert.equal(a.diagnostico?.impressoes, 1200);
  assert.equal(a.geradoEm, "2026-11-18T13:00:00Z");
});

test("campos extras que o banco mandar por engano não passam", () => {
  const a = lerRespostaPublica(
    resposta({
      eventos: [
        {
          id: "e1",
          tipo: "post",
          resumo: "Postagem",
          ocorreu_em: "2026-11-18T05:20:00Z",
          detalhe: "texto interno",
          origem: "equipe",
          ok: false,
        },
      ],
      segredo: "não deve aparecer",
    }),
  );
  assert.ok(a);
  assert.equal(a.eventos[0].detalhe, null);
  assert.equal(a.eventos[0].origem, "publico");
  assert.equal(a.eventos[0].ok, true);
  assert.equal(JSON.stringify(a).includes("segredo"), false);
  assert.equal(JSON.stringify(a).includes("texto interno"), false);
});

test("resposta nula, estranha ou sem o essencial vira null", () => {
  assert.equal(lerRespostaPublica(null), null);
  assert.equal(lerRespostaPublica("texto"), null);
  assert.equal(lerRespostaPublica([]), null);
  assert.equal(lerRespostaPublica({}), null);
  assert.equal(lerRespostaPublica(resposta({ cliente: { nome: "" } })), null);
  assert.equal(lerRespostaPublica(resposta({ eventos: "nada" })), null);
  assert.equal(lerRespostaPublica(resposta({ gerado_em: null })), null);
});

test("evento incompleto ou com data inválida é descartado, sem derrubar o resto", () => {
  const a = lerRespostaPublica(
    resposta({
      eventos: [
        { id: "ok", tipo: "foto", resumo: "Fotos", ocorreu_em: "2026-11-18T05:20:00Z" },
        { id: "sem-resumo", tipo: "foto", ocorreu_em: "2026-11-18T05:20:00Z" },
        { id: "data-ruim", tipo: "foto", resumo: "Fotos", ocorreu_em: "ontem" },
        null,
        "lixo",
      ],
    }),
  );
  assert.deepEqual(
    a?.eventos.map((e) => e.id),
    ["ok"],
  );
});

test("sem diagnóstico ou com números ruins, o resto continua funcionando", () => {
  assert.equal(lerRespostaPublica(resposta({ diagnostico: null }))?.diagnostico, null);
  const d = lerRespostaPublica(resposta({ diagnostico: { lido_em: "2026-11-16", impressoes: "muitas", ligacoes: null } }))?.diagnostico;
  assert.deepEqual(d, { lido_em: "2026-11-16", impressoes: 0, ligacoes: 0, rotas: 0, cliques_site: 0 });
});
