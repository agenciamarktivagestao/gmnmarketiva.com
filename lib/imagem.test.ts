import assert from "node:assert/strict";
import test from "node:test";
import { analisarCapa } from "./imagem.ts";

test("capa em pé ou quadrada é recusada", () => {
  assert.equal(analisarCapa(900, 1600).nivel, "erro");
  assert.equal(analisarCapa(1200, 1200).nivel, "erro");
});

test("16:9 passa sem aviso", () => {
  assert.equal(analisarCapa(1920, 1080).nivel, "ok");
});

test("horizontal fora de 16:9 passa com aviso", () => {
  assert.equal(analisarCapa(1800, 1200).nivel, "aviso"); // 3:2
  assert.equal(analisarCapa(2400, 800).nivel, "aviso"); // 3:1
  assert.equal(analisarCapa(600, 340).nivel, "aviso"); // pequena
});
