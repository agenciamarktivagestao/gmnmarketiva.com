import type { Medicao, Posicao } from "./ranking";

// Dados do modo demonstração: posições fictícias, só para ver a tela do ranking funcionando sem o Supabase.
// Com o banco conectado, nada daqui é usado e a tabela desempenho_ranking começa vazia.

const somarDiasNaData = (dia: string, n: number): string => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// Gerador simples e repetível: a mesma medição sempre sai igual
function sementeDe(texto: string): () => number {
  let x = 2166136261;
  for (const c of texto) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0;
    return ((x ^= x >>> 16) >>> 0) / 4294967296;
  };
}

type Plano = {
  slug: string;
  palavra: string;
  grade: number;
  espacamento_km: number;
  forte: number; // posição no centro da grade
  abertura: number; // quanto a posição piora até o canto da grade
  tendencia: number; // posições ganhas (negativo = perdidas) a cada 15 dias, em direção à medição mais recente
  medicoes: number; // quantas medições existem (as mais recentes)
  semLeitura?: number; // quantos pontos da medição mais recente ficaram sem leitura
};

const PLANOS: Plano[] = [
  { slug: "clinica-central-norte", palavra: "dentista londrina", grade: 5, espacamento_km: 4, forte: 1, abertura: 7, tendencia: 3, medicoes: 3 },
  { slug: "clinica-central-norte", palavra: "implante dentário londrina", grade: 5, espacamento_km: 4, forte: 2, abertura: 9, tendencia: -3, medicoes: 3 },
  { slug: "eletro-company", palavra: "materiais elétricos londrina", grade: 5, espacamento_km: 4, forte: 1, abertura: 9, tendencia: 2, medicoes: 3 },
  { slug: "eletro-company", palavra: "disjuntor", grade: 5, espacamento_km: 4, forte: 3, abertura: 8, tendencia: 0, medicoes: 3 },
  { slug: "dra-ana-luiza", palavra: "dermatologista londrina", grade: 7, espacamento_km: 2.5, forte: 4, abertura: 20, tendencia: 1, medicoes: 3 },
  { slug: "otica-av-rio-de-janeiro", palavra: "ótica londrina", grade: 5, espacamento_km: 4, forte: 1, abertura: 9, tendencia: -4, medicoes: 3, semLeitura: 1 },
  { slug: "otica-av-rio-de-janeiro", palavra: "óculos de grau", grade: 5, espacamento_km: 4, forte: 3, abertura: 11, tendencia: 0, medicoes: 1 },
];

const DIAS_ENTRE_MEDICOES = 15;
const DIAS_DESDE_A_ULTIMA = 11;

function posicoesDe(p: Plano, quantasAntes: number, semLeitura: number): Posicao[] {
  // O ruído de cada ponto é o mesmo em toda medição da palavra: o que muda de uma medição para outra é só a tendência
  const sorteio = sementeDe(`${p.slug}|${p.palavra}`);
  const meio = (p.grade - 1) / 2;
  const maior = Math.hypot(meio, meio);
  const posicoes: Posicao[] = [];
  for (let linha = 0; linha < p.grade; linha++) {
    for (let coluna = 0; coluna < p.grade; coluna++) {
      const distancia = Math.hypot(linha - meio, coluna - meio) / maior; // 0 no centro, 1 no canto
      const ruido = (sorteio() - 0.5) * 3;
      // Tendência positiva: as medições mais antigas eram piores, p.tendencia posições a cada 15 dias para trás (negativa: eram melhores)
      const posicao = Math.round(p.forte + distancia * p.abertura + ruido + quantasAntes * p.tendencia);
      posicoes.push(posicao > 20 ? 21 : Math.max(1, posicao));
    }
  }
  // Pontos sem leitura, sempre nos últimos (o canto sudeste): a varredura parou ali
  for (let i = 0; i < semLeitura; i++) posicoes[posicoes.length - 1 - i] = null;
  return posicoes;
}

export function rankingDemonstracao(idDe: (slug: string) => string, hoje: string): Medicao[] {
  const ultima = somarDiasNaData(hoje, -DIAS_DESDE_A_ULTIMA);
  return PLANOS.flatMap((p) =>
    Array.from({ length: p.medicoes }, (_, i) => {
      const quantasAntes = p.medicoes - 1 - i; // 0 = a medição mais recente
      const dia = somarDiasNaData(ultima, -DIAS_ENTRE_MEDICOES * quantasAntes);
      return {
        cliente_id: idDe(p.slug),
        dia,
        palavra: p.palavra,
        grade: p.grade,
        espacamento_km: p.espacamento_km,
        posicoes: posicoesDe(p, quantasAntes, quantasAntes === 0 ? (p.semLeitura ?? 0) : 0),
        fonte: "demonstração",
      };
    }),
  );
}
