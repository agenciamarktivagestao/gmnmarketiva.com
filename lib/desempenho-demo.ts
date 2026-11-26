import type { DiaDoCliente, Reputacao, TermoBusca } from "./desempenho";

// Dados do modo demonstração: números fictícios, gerados a partir dos totais de 30 dias da leitura de 16/11/2026.
// Servem só para ver a tela funcionando sem o Supabase. Com o banco conectado, nada daqui é usado.

export type TotaisDe30Dias = { slug: string; impressoes: number; ligacoes: number; rotas: number; cliques_site: number };

const somarDiasNaData = (dia: string, n: number): string => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// Gerador simples e repetível: o mesmo cliente sempre recebe a mesma série
function sementeDe(texto: string): () => number {
  let x = 2166136261;
  for (const c of texto) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0;
    return ((x ^= x >>> 16) >>> 0) / 4294967296;
  };
}

// Reparte `total` em `n` partes com pesos irregulares; a soma fecha exatamente em `total`
function repartir(total: number, n: number, sorteio: () => number): number[] {
  const pesos = Array.from({ length: n }, () => 0.4 + sorteio());
  const soma = pesos.reduce((a, b) => a + b, 0);
  const partes = pesos.map((p) => Math.floor((total * p) / soma));
  let resto = total - partes.reduce((a, b) => a + b, 0);
  for (let i = 0; resto > 0; i = (i + 1) % n, resto--) partes[i] += 1;
  return partes;
}

export function desempenhoDemonstracao(totais: TotaisDe30Dias[], idDe: (slug: string) => string, ultimoDia: string, n = 30): DiaDoCliente[] {
  const primeiro = somarDiasNaData(ultimoDia, -(n - 1));
  return totais.flatMap((t) => {
    const sorteio = sementeDe(t.slug);
    const busca_cel = repartir(Math.round(t.impressoes * 0.55), n, sorteio);
    const maps_cel = repartir(Math.round(t.impressoes * 0.2), n, sorteio);
    const busca_pc = repartir(Math.round(t.impressoes * 0.15), n, sorteio);
    const maps_pc = repartir(Math.max(0, t.impressoes - Math.round(t.impressoes * 0.9)), n, sorteio);
    const ligacoes = repartir(t.ligacoes, n, sorteio);
    const rotas = repartir(t.rotas, n, sorteio);
    const cliques_site = repartir(t.cliques_site, n, sorteio);
    return Array.from({ length: n }, (_, i) => ({
      cliente_id: idDe(t.slug),
      dia: somarDiasNaData(primeiro, i),
      maps_pc: maps_pc[i],
      busca_pc: busca_pc[i],
      maps_cel: maps_cel[i],
      busca_cel: busca_cel[i],
      ligacoes: ligacoes[i],
      cliques_site: cliques_site[i],
      rotas: rotas[i],
      reservas: 0,
    }));
  });
}

export function termosDemonstracao(idDe: (slug: string) => string): TermoBusca[] {
  const t = (slug: string, termo: string, usuarios: number | null): TermoBusca => ({
    cliente_id: idDe(slug),
    mes: "2026-10-01",
    termo,
    usuarios,
    abaixo_de: usuarios === null ? 15 : null,
  });
  return [
    t("clinica-central-norte", "dentista londrina", 82),
    t("clinica-central-norte", "clinica dentaria central", 73),
    t("clinica-central-norte", "dentista saul elkind", 61),
    t("clinica-central-norte", "clinica odontologica londrina", 33),
    t("clinica-central-norte", "dentista zona norte londrina", 17),
    t("clinica-central-norte", "implante dentario", null),
    t("clinica-central-norte", "ortodontia", null),
    t("eletro-company", "materiais eletricos londrina", 93),
    t("eletro-company", "disjuntor", 79),
    t("eletro-company", "material eletrico londrina", 58),
    t("eletro-company", "eletro", 54),
    t("eletro-company", "casa eletrica", null),
  ];
}

export function reputacaoDemonstracao(idDe: (slug: string) => string, dia: string): Reputacao[] {
  const r = (slug: string, nota: number | null, total: number): Reputacao => ({ cliente_id: idDe(slug), dia, nota, total_avaliacoes: total });
  return [r("clinica-central-norte", 4.9, 811), r("eletro-company", 4.7, 171), r("dra-ana-luiza", 4.8, 17), r("otica-av-rio-de-janeiro", 4.7, 47)];
}
