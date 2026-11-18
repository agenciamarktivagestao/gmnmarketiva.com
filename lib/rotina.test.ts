import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AJUSTES_PADRAO,
  ajustesDoClientePadrao,
  ajustesPorCliente,
  conferirNumeros,
  eClientePadrao,
  normalizarAjustes,
  resumoDoCliente,
} from "./rotina.ts";

test("os números dos ajustes são conferidos, com mensagem em português", () => {
  assert.equal(conferirNumeros({ limite_ajustes: "10", meta_minima: "4", max_postagens: "4" }), null);
  assert.equal(
    conferirNumeros({ limite_ajustes: 0, meta_minima: 0, max_postagens: 4 }),
    "O limite de ajustes por noite deve ser um número de 1 a 20.",
  );
  assert.equal(
    conferirNumeros({ limite_ajustes: 6, meta_minima: 8, max_postagens: 4 }),
    "A meta mínima não pode ser maior que o limite de ajustes por noite.",
  );
  assert.equal(
    conferirNumeros({ limite_ajustes: 6, meta_minima: 2, max_postagens: 17 }),
    "O máximo de postagens por noite deve ser um número de 0 a 16.",
  );
  assert.equal(
    conferirNumeros({ limite_ajustes: "abc", meta_minima: 2, max_postagens: 4 }),
    "O limite de ajustes por noite deve ser um número de 1 a 20.",
  );
  assert.equal(
    conferirNumeros({ limite_ajustes: "5.5", meta_minima: 2, max_postagens: 4 }),
    "O limite de ajustes por noite deve ser um número de 1 a 20.",
  );
});

test("sem linha no banco, a rotina fica com tudo liberado e os limites de sempre", () => {
  const a = normalizarAjustes(null);
  assert.deepEqual(a, AJUSTES_PADRAO);
  assert.equal(a.limite_ajustes, 10);
  assert.equal(a.meta_minima, 4);
});

test("campos faltando ou de tipo errado usam o padrão, os válidos são mantidos", () => {
  const a = normalizarAjustes({ ativa: false, limite_ajustes: 6, max_postagens: "x", enviar_fotos: "sim", atualizado_por: "ana@marktiva" });
  assert.equal(a.ativa, false);
  assert.equal(a.limite_ajustes, 6);
  assert.equal(a.max_postagens, 4);
  assert.equal(a.enviar_fotos, true);
  assert.equal(a.atualizado_por, "ana@marktiva");
});

test("cliente sem linha aparece com tudo liberado", () => {
  const mudado = { ...ajustesDoClientePadrao("c2"), pausada: true, nota: "Aguardando o dono" };
  const mapa = ajustesPorCliente([mudado], ["c1", "c2", "c3"]);
  assert.deepEqual([...mapa.keys()], ["c1", "c2", "c3"]);
  assert.equal(eClientePadrao(mapa.get("c1")!), true);
  assert.equal(eClientePadrao(mapa.get("c2")!), false);
});

test("um recado já basta para o cliente não ser considerado padrão", () => {
  assert.equal(eClientePadrao({ ...ajustesDoClientePadrao("c1"), nota: "  " }), true);
  assert.equal(eClientePadrao({ ...ajustesDoClientePadrao("c1"), nota: "Só postagens" }), false);
});

test("o resumo do cliente diz o que está restrito", () => {
  assert.equal(resumoDoCliente(ajustesDoClientePadrao("c1")), "Tudo liberado.");
  assert.equal(resumoDoCliente({ ...ajustesDoClientePadrao("c1"), pausada: true }), "Pausado: a rotina não mexe neste cliente.");
  assert.equal(
    resumoDoCliente({ ...ajustesDoClientePadrao("c1"), fotos: false, respostas: false }),
    "Sem: enviar fotos, responder avaliações.",
  );
});
