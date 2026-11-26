// Ranking regional: em que posição o perfil aparece no Google Maps em cada ponto de uma grade ao redor do endereço.
// Funções puras (sem banco, sem React), para poder testar. Os números seguem a mesma conta da ferramenta de varredura
// (GeoGrid): presença no top 3 (SoLV), onde aparece e posição média (ARP), para o painel bater com o que a equipe vê lá.

export const FORA_DO_TOP_20 = 21; // "20+": o perfil não está entre os 20 primeiros daquele ponto
export const PARTE_MINIMA_LIDA = 0.8; // abaixo disso a medição perdeu pontos demais (bloqueio, erro) para comparar com outra
const MUDANCA_MINIMA_NO_TOP3 = 1; // pontos percentuais
const MUDANCA_MINIMA_NA_POSICAO = 0.5; // posições
const MUDANCA_MINIMA_NA_PRESENCA = 5; // pontos percentuais

// 1 a 20 = posição do perfil; 21 = fora das 20 primeiras; null = ponto que não foi lido
export type Posicao = number | null;

export type Medicao = {
  cliente_id: string;
  dia: string; // AAAA-MM-DD do dia da varredura
  palavra: string;
  grade: number; // 5 = grade 5x5
  espacamento_km: number;
  posicoes: Posicao[]; // grade x grade itens, linha a linha, a partir do canto noroeste
  fonte: string;
};

const arredondar = (n: number, casas: number) => {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};
const media = (valores: number[]) => (valores.length === 0 ? null : valores.reduce((s, v) => s + v, 0) / valores.length);
const numeroBR = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

// Lê as posições vindas do banco: o tamanho tem que fechar com a grade, e qualquer item fora de 1 a 21 vira "sem leitura"
export function lerPosicoes(valor: unknown, grade: number): Posicao[] | null {
  if (!Array.isArray(valor) || valor.length !== grade * grade) return null;
  return valor.map((v) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= FORA_DO_TOP_20 ? v : null));
}

export type Banda = "top3" | "top10" | "top20" | "fora" | "sem";

export function bandaDaPosicao(p: Posicao): Banda {
  if (p === null) return "sem";
  if (p <= 3) return "top3";
  if (p <= 10) return "top10";
  if (p <= 20) return "top20";
  return "fora";
}

export const textoDaPosicao = (p: Posicao): string => (p === null ? "–" : p >= FORA_DO_TOP_20 ? "20+" : String(p));

export type Resumo = {
  pontos: number; // pontos da grade
  lidos: number; // pontos que a varredura conseguiu ler
  apareceEm: number; // pontos em que o perfil está entre os 20 primeiros
  noTop3: number;
  solv: number | null; // % dos pontos lidos em que o perfil está no top 3
  apareceEmPct: number | null; // % dos pontos lidos em que o perfil está entre os 20 primeiros
  arp: number | null; // posição média, só onde o perfil aparece (menor é melhor)
};

export function resumir(posicoes: Posicao[]): Resumo {
  const lidas = posicoes.filter((p): p is number => p !== null);
  const aparece = lidas.filter((p) => p < FORA_DO_TOP_20);
  const noTop3 = aparece.filter((p) => p <= 3).length;
  const arp = media(aparece);
  return {
    pontos: posicoes.length,
    lidos: lidas.length,
    apareceEm: aparece.length,
    noTop3,
    solv: lidas.length > 0 ? arredondar((100 * noTop3) / lidas.length, 1) : null,
    apareceEmPct: lidas.length > 0 ? arredondar((100 * aparece.length) / lidas.length, 1) : null,
    arp: arp === null ? null : arredondar(arp, 2),
  };
}

// Uma medição que leu pouca coisa não vale como retrato da região
export const medicaoConfiavel = (r: Resumo) => r.pontos > 0 && r.lidos / r.pontos >= PARTE_MINIMA_LIDA;

export type Sentido = "subiu" | "caiu" | "igual";
export type Porque = "top3" | "posicao" | "presenca" | "nada";

export type Mudanca =
  | { comparavel: true; sentido: Sentido; porque: Porque; antes: Resumo; agora: Resumo; anteriorDia: string }
  | { comparavel: false; motivo: string };

// "Subiu" quer dizer que o perfil está melhor colocado: mais presença no top 3 ou posição média menor.
// O que decide é a presença no top 3; quando ela quase não mexe, a posição média; depois, em quantos pontos o perfil aparece.
function decidir(antes: Resumo, agora: Resumo): { sentido: Sentido; porque: Porque } {
  const deSolv = (agora.solv ?? 0) - (antes.solv ?? 0);
  const deArp = agora.arp !== null && antes.arp !== null ? agora.arp - antes.arp : null;
  const dePresenca = (agora.apareceEmPct ?? 0) - (antes.apareceEmPct ?? 0);
  if (Math.abs(deSolv) >= MUDANCA_MINIMA_NO_TOP3) return { sentido: deSolv > 0 ? "subiu" : "caiu", porque: "top3" };
  if (deArp !== null && Math.abs(deArp) >= MUDANCA_MINIMA_NA_POSICAO) return { sentido: deArp < 0 ? "subiu" : "caiu", porque: "posicao" };
  if (Math.abs(dePresenca) >= MUDANCA_MINIMA_NA_PRESENCA) return { sentido: dePresenca > 0 ? "subiu" : "caiu", porque: "presenca" };
  return { sentido: "igual", porque: "nada" };
}

export function compararMedicoes(atual: Medicao, anterior: Medicao): Mudanca {
  if (atual.grade !== anterior.grade || atual.espacamento_km !== anterior.espacamento_km) {
    return { comparavel: false, motivo: "a grade mudou desde a medição anterior" };
  }
  const agora = resumir(atual.posicoes);
  const antes = resumir(anterior.posicoes);
  if (!medicaoConfiavel(agora) || !medicaoConfiavel(antes)) {
    return { comparavel: false, motivo: "faltou ler muitos pontos em uma das medições" };
  }
  return { comparavel: true, ...decidir(antes, agora), antes, agora, anteriorDia: anterior.dia };
}

export const deSolvDaMudanca = (m: Mudanca & { comparavel: true }): number => arredondar((m.agora.solv ?? 0) - (m.antes.solv ?? 0), 1);

// A frase que acompanha a seta: a seta e a palavra dizem a mesma coisa, então nada depende só da cor
export function fraseDaMudanca(m: Mudanca & { comparavel: true }): string {
  const sobe = m.sentido === "subiu";
  switch (m.porque) {
    case "top3": {
      const d = Math.abs(deSolvDaMudanca(m));
      return `${sobe ? "subiu" : "caiu"} ${numeroBR(d)} ${d === 1 ? "ponto" : "pontos"} no top 3`;
    }
    case "posicao": {
      const d = Math.abs(arredondar((m.agora.arp ?? 0) - (m.antes.arp ?? 0), 1));
      return `posição média ${sobe ? "melhorou" : "piorou"} ${numeroBR(d)}`;
    }
    case "presenca":
      return sobe ? "aparece em mais pontos da região" : "aparece em menos pontos da região";
    default:
      return "sem mudança relevante";
  }
}

export type PalavraMedida = {
  palavra: string;
  atual: Medicao;
  resumo: Resumo;
  anterior: Medicao | null;
  mudanca: Mudanca | null; // null = é a primeira medição
  historico: { dia: string; solv: number | null }[]; // do mais antigo para o mais novo
};

// Junta as medições de um cliente por palavra. A lista de entrada pode vir em qualquer ordem.
export function agruparPorPalavra(medicoes: Medicao[]): PalavraMedida[] {
  const porPalavra = new Map<string, Medicao[]>();
  for (const m of medicoes) {
    const chave = m.palavra.trim();
    porPalavra.set(chave, [...(porPalavra.get(chave) ?? []), m]);
  }
  return [...porPalavra.entries()]
    .map(([palavra, lista]) => {
      const ordenada = [...lista].sort((a, b) => a.dia.localeCompare(b.dia));
      const atual = ordenada[ordenada.length - 1];
      const anterior = ordenada.length > 1 ? ordenada[ordenada.length - 2] : null;
      return {
        palavra,
        atual,
        resumo: resumir(atual.posicoes),
        anterior,
        mudanca: anterior ? compararMedicoes(atual, anterior) : null,
        historico: ordenada.map((m) => ({ dia: m.dia, solv: resumir(m.posicoes).solv })),
      };
    })
    .sort((a, b) => a.palavra.localeCompare(b.palavra, "pt-BR"));
}

export type ResumoDoCliente = {
  clienteId: string;
  palavras: PalavraMedida[];
  ultimoDia: string;
  solvMedio: number | null; // média da presença no top 3 das palavras, na última medição de cada uma
  arpMedio: number | null;
  // O que mudou no cliente: a mesma regra de cada palavra, aplicada às médias das palavras que têm medição anterior comparável.
  // null = nenhuma palavra tem com o que comparar.
  mudanca: (Mudanca & { comparavel: true }) | null;
  sentido: Sentido | null;
  misto: boolean; // há palavras que subiram e palavras que caíram: a média esconde isso
  comparaveis: number; // quantas palavras entraram na comparação
};

const mediaDeResumos = (rs: Resumo[], campo: "solv" | "arp" | "apareceEmPct"): number | null => {
  const m = media(rs.flatMap((r) => (r[campo] === null ? [] : [r[campo] as number])));
  return m === null ? null : arredondar(m, campo === "arp" ? 2 : 1);
};

const resumoMedio = (rs: Resumo[]): Resumo => ({
  pontos: 0,
  lidos: 0,
  apareceEm: 0,
  noTop3: 0,
  solv: mediaDeResumos(rs, "solv"),
  apareceEmPct: mediaDeResumos(rs, "apareceEmPct"),
  arp: mediaDeResumos(rs, "arp"),
});

export function resumoDoCliente(clienteId: string, palavras: PalavraMedida[]): ResumoDoCliente {
  const comparaveis = palavras.flatMap((p) => (p.mudanca && p.mudanca.comparavel ? [p.mudanca] : []));
  const mudanca: (Mudanca & { comparavel: true }) | null =
    comparaveis.length === 0
      ? null
      : (() => {
          const antes = resumoMedio(comparaveis.map((m) => m.antes));
          const agora = resumoMedio(comparaveis.map((m) => m.agora));
          const dias = comparaveis.map((m) => m.anteriorDia).sort();
          return { comparavel: true as const, ...decidir(antes, agora), antes, agora, anteriorDia: dias[dias.length - 1] };
        })();
  return {
    clienteId,
    palavras,
    ultimoDia: palavras.reduce((m, p) => (p.atual.dia > m ? p.atual.dia : m), ""),
    solvMedio: mediaDeResumos(palavras.map((p) => p.resumo), "solv"),
    arpMedio: mediaDeResumos(palavras.map((p) => p.resumo), "arp"),
    mudanca,
    sentido: mudanca ? mudanca.sentido : null,
    misto: comparaveis.some((m) => m.sentido === "subiu") && comparaveis.some((m) => m.sentido === "caiu"),
    comparaveis: comparaveis.length,
  };
}

// A frase da linha do cliente na visão geral (a mesma das palavras, só que sobre a média delas)
export const fraseDoCliente = (r: ResumoDoCliente): string => (r.mudanca ? fraseDaMudanca(r.mudanca) : "primeira medição");

// Todos os clientes que têm medição, cada um com suas palavras
export function agruparPorCliente(medicoes: Medicao[]): ResumoDoCliente[] {
  const porCliente = new Map<string, Medicao[]>();
  for (const m of medicoes) porCliente.set(m.cliente_id, [...(porCliente.get(m.cliente_id) ?? []), m]);
  return [...porCliente.entries()].map(([id, lista]) => resumoDoCliente(id, agruparPorPalavra(lista)));
}
