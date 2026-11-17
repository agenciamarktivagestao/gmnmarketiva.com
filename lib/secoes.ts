import type { Campo, Nivel } from "./tipos";

// As partes do perfil do Google, na ordem em que aparecem na prévia.
// `campos` são as chaves do diagnóstico (lib/rotulos.ts, CAMPOS) que dizem a situação de cada parte.
export type ChaveSecao = "fotos" | "nome" | "descricao" | "servicos" | "horario" | "area" | "atributos" | "avaliacoes" | "posts" | "outras";

export const SECOES: { chave: ChaveSecao; nome: string; campos: string[] }[] = [
  { chave: "fotos", nome: "Capa e fotos", campos: ["capa", "fotos"] },
  { chave: "nome", nome: "Nome, categorias e endereço", campos: ["nome", "categorias", "endereco"] },
  { chave: "descricao", nome: "Descrição", campos: ["descricao"] },
  { chave: "servicos", nome: "Serviços", campos: ["servicos"] },
  { chave: "horario", nome: "Horário", campos: ["horario"] },
  { chave: "area", nome: "Área de atendimento", campos: ["area"] },
  { chave: "atributos", nome: "Atributos", campos: ["atributos"] },
  { chave: "avaliacoes", nome: "Avaliações", campos: ["avaliacoes"] },
  { chave: "posts", nome: "Postagens", campos: ["posts"] },
];

const CHAVES = new Set<string>([...SECOES.map((s) => s.chave), "outras"]);

// A que parte do perfil a pendência pertence. A rotina pode dizer em `payload.secao`; sem isso vale o campo
// do diagnóstico que `camposDaPendencia` (lib/campos-regras.ts) infere pelo título, o mesmo que a matriz do Painel usa.
export function secaoDe(p: { payload?: Record<string, unknown> | null }, camposDaPendencia: string[]): ChaveSecao {
  const dita = p.payload?.secao;
  if (typeof dita === "string" && CHAVES.has(dita)) return dita as ChaveSecao;
  const campo = camposDaPendencia[0];
  return SECOES.find((s) => s.campos.includes(campo))?.chave ?? "outras";
}

const PIOR: Record<Nivel, number> = { ok: 0, rever: 1, falta: 2 };

// Situação de uma parte: a pior entre as suas chaves, mais um resumo curto para o cabeçalho.
export function situacaoDaSecao(
  campos: Record<string, Campo> | undefined,
  chaves: string[],
  nomeDe: (chave: string) => string,
): { nivel: Nivel | null; resumo: string } {
  const presentes = chaves.map((c) => ({ chave: c, campo: campos?.[c] })).filter((x): x is { chave: string; campo: Campo } => !!x.campo);
  if (presentes.length === 0) return { nivel: null, resumo: "" };
  const nivel = presentes.reduce<Nivel>((pior, x) => (PIOR[x.campo.nivel] > PIOR[pior] ? x.campo.nivel : pior), "ok");
  if (presentes.length === 1) return { nivel, resumo: presentes[0].campo.valor };
  const fora = presentes.filter((x) => x.campo.nivel !== "ok");
  return { nivel, resumo: fora.length === 0 ? "Em ordem" : fora.map((x) => `${nomeDe(x.chave)}: ${x.campo.valor}`).join(" · ") };
}
