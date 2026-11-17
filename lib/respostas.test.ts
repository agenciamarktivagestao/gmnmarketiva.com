import assert from "node:assert/strict";
import test from "node:test";
import { conferirEntrada, conferirEscolha } from "./respostas.ts";

test("escolha: aceita só opções do payload", () => {
  const payload = { opcoes: [{ valor: "a", rotulo: "Av. A" }, { valor: "b", rotulo: "Rua B" }], permitir_outro: false };
  assert.deepEqual(conferirEscolha(payload, { valor: "a" }), { valor: { opcao: "a", rotulo: "Av. A" }, resumo: "Av. A" });
  assert.ok("erro" in conferirEscolha(payload, { valor: "x" }));
  assert.ok("erro" in conferirEscolha(payload, { valor: "outro", outro: "Rua C" }), "outro só se a pergunta permitir");
});

test("escolha: 'outro' exige texto", () => {
  const payload = { opcoes: [{ valor: "a", rotulo: "A" }], permitir_outro: true };
  assert.ok("erro" in conferirEscolha(payload, { valor: "outro", outro: "  " }));
  assert.deepEqual(conferirEscolha(payload, { valor: "outro", outro: " Rua C " }), { valor: { opcao: "outro", outro: "Rua C" }, resumo: "Outro: Rua C" });
});

test("cidades: tira vazias e repetidas", () => {
  const r = conferirEntrada({ campo: "cidades" }, "cidades", ["Cambé", " Londrina ", "Cambé", ""]);
  assert.deepEqual(r, { valor: ["Cambé", "Londrina"], resumo: "Cidades: Cambé, Londrina" });
  assert.ok("erro" in conferirEntrada({ campo: "cidades" }, "cidades", []));
});

test("o campo precisa ser o que a pendência pede", () => {
  assert.ok("erro" in conferirEntrada({ campo: "texto" }, "cidades", ["Cambé"]));
});

test("checklist: ignora o que não está na lista e aceita 'nenhum'", () => {
  const payload = { campo: "checklist" as const, opcoes: ["Pagamento", "Estacionamento"] };
  const r = conferirEntrada(payload, "checklist", { marcados: ["Pagamento", "Invasor"], outro: "Wi-Fi" });
  assert.deepEqual(r, { valor: { marcados: ["Pagamento"], outro: "Wi-Fi" }, resumo: "Vale: Pagamento, Wi-Fi" });
  assert.deepEqual(conferirEntrada(payload, "checklist", { marcados: [] }), { valor: { marcados: [] }, resumo: "Nenhum deles vale" });
});

test("horário: confere todos os dias pedidos e a ordem das horas", () => {
  const payload = { campo: "horario" as const, dias: ["sab" as const] };
  assert.ok("erro" in conferirEntrada(payload, "horario", {}));
  assert.ok("erro" in conferirEntrada(payload, "horario", { sab: { modo: "horario", abre: "18:00", fecha: "08:00" } }));
  assert.ok("erro" in conferirEntrada(payload, "horario", { sab: { modo: "horario", abre: "8h", fecha: "12:00" } }));
  assert.deepEqual(conferirEntrada(payload, "horario", { sab: { modo: "horario", abre: "08:00", fecha: "12:00" } }), {
    valor: { sab: { modo: "horario", abre: "08:00", fecha: "12:00" } },
    resumo: "Sáb 08:00 às 12:00",
  });
  assert.deepEqual(conferirEntrada(payload, "horario", { sab: { modo: "fechado" } }), { valor: { sab: { modo: "fechado" } }, resumo: "Sáb fechado" });
});

test("horário sem 'dias' pede a semana toda", () => {
  const r = conferirEntrada({ campo: "horario" }, "horario", { seg: { modo: "24h" } });
  assert.ok("erro" in r);
});
