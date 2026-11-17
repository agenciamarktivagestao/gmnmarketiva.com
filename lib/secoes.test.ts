import assert from "node:assert/strict";
import { test } from "node:test";
import { camposDaPendencia } from "./campos-regras.ts";
import { secaoDe, situacaoDaSecao } from "./secoes.ts";

const de = (titulo: string, payload?: Record<string, unknown>) => secaoDe({ payload }, camposDaPendencia({ titulo }));

test("títulos reais das pendências caem na parte certa do perfil", () => {
  const esperado: Record<string, string> = {
    "Nome com palavras-chave e cidade": "nome",
    "Sem categorias adicionais": "nome",
    "Categoria principal fraca": "nome",
    "Categoria principal: escritório": "nome",
    "Categorias de estúdio": "nome",
    "Endereço em conflito": "nome",
    "Endereço escrito errado": "nome",
    "Nome e endereço não batem": "nome",
    "Poucas fotos novas": "fotos",
    "Capa vertical": "fotos",
    "Capa quadrada": "fotos",
    "Confirmar a capa": "fotos",
    "Sem fotos e sem capa": "fotos",
    "8 fotos no Drive sem subir": "fotos",
    "Área de atendimento vazia": "area",
    "Serviços sem descrição": "servicos",
    "Poucos serviços": "servicos",
    "Confirmar joias, relógios e presentes": "servicos",
    'Confirmar "lentes de contato dental"': "servicos",
    "Atributos quase vazios": "atributos",
    "Atributos vazios": "atributos",
    "Atributos incompletos": "atributos",
    "Sem horário de sábado": "horario",
    "Aberto 24 horas, todos os dias": "horario",
    "Avaliação sem resposta": "avaliacoes",
    "3 avaliações de 1 estrela sem resposta": "avaliacoes",
    "Resposta pronta e não publicada": "avaliacoes",
    "799 avaliações, só o último mês visível": "avaliacoes",
    "17 avaliações não lidas": "avaliacoes",
    "2 avaliações retidas": "avaliacoes",
    "Nenhuma postagem em 30 dias": "posts",
    "Descrição com dados da rede": "descricao",
    "Perfil duplicado": "outras",
    "Sem pasta no Drive": "fotos",
    "Aba Produtos fora do alcance": "outras",
    "Demais empresas não aparecem no Windsor": "outras",
  };
  for (const [titulo, secao] of Object.entries(esperado)) assert.equal(de(titulo), secao, titulo);
});

test("a rotina pode dizer a parte em payload.secao", () => {
  assert.equal(de("Algo sem palavra-chave", { secao: "horario" }), "horario");
  assert.equal(de("Capa vertical", { secao: "descricao" }), "descricao");
  assert.equal(de("Capa vertical", { secao: "inventada" }), "fotos");
});

test("situação da parte: a pior das chaves, resumo só do que não está em ordem", () => {
  const campos = {
    nome: { valor: "Palavras-chave", nivel: "rever" as const },
    categorias: { valor: "4", nivel: "ok" as const },
    endereco: { valor: "Ok", nivel: "ok" as const },
    descricao: { valor: "731 car.", nivel: "ok" as const },
  };
  const nome = (c: string) => ({ nome: "Nome", categorias: "Categorias", endereco: "Endereço" })[c] ?? c;
  assert.deepEqual(situacaoDaSecao(campos, ["nome", "categorias", "endereco"], nome), { nivel: "rever", resumo: "Nome: Palavras-chave" });
  assert.deepEqual(situacaoDaSecao(campos, ["descricao"], nome), { nivel: "ok", resumo: "731 car." });
  assert.deepEqual(situacaoDaSecao(campos, ["categorias", "endereco"], nome), { nivel: "ok", resumo: "Em ordem" });
  assert.deepEqual(situacaoDaSecao({ ...campos, endereco: { valor: "Falta", nivel: "falta" } }, ["nome", "endereco"], nome).nivel, "falta");
  assert.deepEqual(situacaoDaSecao(undefined, ["nome"], nome), { nivel: null, resumo: "" });
});
