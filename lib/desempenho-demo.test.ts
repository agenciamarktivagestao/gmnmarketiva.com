import { test } from "node:test";
import assert from "node:assert/strict";
import { desempenhoDemonstracao } from "./desempenho-demo.ts";

const base = [
  { slug: "a", impressoes: 296, ligacoes: 25, rotas: 46, cliques_site: 0 },
  { slug: "b", impressoes: 20, ligacoes: 0, rotas: 3, cliques_site: 7 },
];
const idDe = (s: string) => `c-${s}`;

test("a demonstração fecha exatamente nos totais de 30 dias da leitura", () => {
  const dias = desempenhoDemonstracao(base, idDe, "2026-11-13");
  for (const b of base) {
    const meus = dias.filter((d) => d.cliente_id === idDe(b.slug));
    assert.equal(meus.length, 30);
    const soma = (f: (d: (typeof meus)[number]) => number) => meus.reduce((s, d) => s + f(d), 0);
    assert.equal(soma((d) => d.maps_pc + d.busca_pc + d.maps_cel + d.busca_cel), b.impressoes);
    assert.equal(soma((d) => d.ligacoes), b.ligacoes);
    assert.equal(soma((d) => d.rotas), b.rotas);
    assert.equal(soma((d) => d.cliques_site), b.cliques_site);
  }
});

test("a demonstração termina no dia pedido e é repetível", () => {
  const a = desempenhoDemonstracao(base, idDe, "2026-11-13");
  const b = desempenhoDemonstracao(base, idDe, "2026-11-13");
  assert.deepEqual(a, b);
  assert.equal(a.filter((d) => d.cliente_id === "c-a").at(-1)?.dia, "2026-11-13");
  assert.equal(a.filter((d) => d.cliente_id === "c-a")[0].dia, "2026-10-15");
  assert.ok(a.every((d) => d.maps_pc >= 0 && d.busca_pc >= 0 && d.maps_cel >= 0 && d.busca_cel >= 0));
});
