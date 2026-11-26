// Desempenho dos perfis: o que o Google mostra de cada cliente ao longo do tempo.
// A rotina grava os números dia a dia (desempenho_diario); aqui eles viram comparações, séries e rankings.
// Este arquivo só importa tipos de outros: os testes rodam direto no Node. Os dias são "AAAA-MM-DD" (o dia em que o Google contou).

export type DiaDesempenho = {
  dia: string;
  maps_pc: number;
  busca_pc: number;
  maps_cel: number;
  busca_cel: number;
  ligacoes: number;
  cliques_site: number;
  rotas: number;
  reservas: number;
};

export type DiaDoCliente = DiaDesempenho & { cliente_id: string };

export type TermoBusca = {
  cliente_id: string;
  mes: string; // sempre o dia 1: "2026-10-01"
  termo: string;
  usuarios: number | null;
  abaixo_de: number | null;
};

export type Reputacao = { cliente_id: string; dia: string; nota: number | null; total_avaliacoes: number | null };

// O Google demora cerca de 3 dias para fechar um dia: a rotina só grava até hoje - 3
export const ATRASO_DO_GOOGLE_EM_DIAS = 3;
export const DIAS_DA_JANELA = 7;
// Abaixo disto o percentual engana (de 2 para 4 não é "+100%"): mostramos a diferença em número
export const BASE_MINIMA_PARA_PERCENTUAL = 10;

// ---------------------------------------------------------------------------
// Datas (sem fuso: o dia do Google é só uma data)
// ---------------------------------------------------------------------------
const DIA_MS = 86_400_000;
const emMs = (dia: string) => Date.parse(`${dia}T00:00:00Z`);

export const somarDiasNaData = (dia: string, n: number): string => new Date(emMs(dia) + n * DIA_MS).toISOString().slice(0, 10);
export const diasEntre = (de: string, ate: string): number => Math.round((emMs(ate) - emMs(de)) / DIA_MS);

export const diaCurto = (dia: string) => `${dia.slice(8)}/${dia.slice(5, 7)}`;
export const diaCompleto = (dia: string) => `${dia.slice(8)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
export const diaPorExtenso = (dia: string) =>
  new Date(emMs(dia)).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const mesPorExtenso = (mes: string) => new Date(emMs(mes)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
export const numeroBR = (n: number) => n.toLocaleString("pt-BR");

// ---------------------------------------------------------------------------
// Totais
// ---------------------------------------------------------------------------
export type Totais = {
  aparicoes: number; // vezes que o perfil apareceu (Maps + Busca, celular + computador)
  maps_pc: number;
  busca_pc: number;
  maps_cel: number;
  busca_cel: number;
  ligacoes: number;
  rotas: number;
  cliques_site: number;
  reservas: number;
  contatos: number; // ligações + pedidos de rota + cliques no site + reservas
};

export const aparicoesDoDia = (d: DiaDesempenho) => d.maps_pc + d.busca_pc + d.maps_cel + d.busca_cel;
export const contatosDoDia = (d: DiaDesempenho) => d.ligacoes + d.rotas + d.cliques_site + d.reservas;

export function somar(dias: DiaDesempenho[]): Totais {
  const t: Totais = { aparicoes: 0, maps_pc: 0, busca_pc: 0, maps_cel: 0, busca_cel: 0, ligacoes: 0, rotas: 0, cliques_site: 0, reservas: 0, contatos: 0 };
  for (const d of dias) {
    t.maps_pc += d.maps_pc;
    t.busca_pc += d.busca_pc;
    t.maps_cel += d.maps_cel;
    t.busca_cel += d.busca_cel;
    t.ligacoes += d.ligacoes;
    t.rotas += d.rotas;
    t.cliques_site += d.cliques_site;
    t.reservas += d.reservas;
  }
  t.aparicoes = t.maps_pc + t.busca_pc + t.maps_cel + t.busca_cel;
  t.contatos = t.ligacoes + t.rotas + t.cliques_site + t.reservas;
  return t;
}

// Soma de vários clientes (a visão geral da operação)
export function somarTotais(lista: Totais[]): Totais {
  const t = somar([]);
  for (const x of lista) {
    (Object.keys(t) as (keyof Totais)[]).forEach((k) => {
      t[k] += x[k];
    });
  }
  return t;
}

// Uma linha por dia, somando os clientes (a série da operação inteira)
export function agruparPorDia(dias: DiaDesempenho[]): DiaDesempenho[] {
  const porDia = new Map<string, DiaDesempenho>();
  for (const d of dias) {
    const a = porDia.get(d.dia);
    if (!a) {
      porDia.set(d.dia, { ...d });
      continue;
    }
    a.maps_pc += d.maps_pc;
    a.busca_pc += d.busca_pc;
    a.maps_cel += d.maps_cel;
    a.busca_cel += d.busca_cel;
    a.ligacoes += d.ligacoes;
    a.cliques_site += d.cliques_site;
    a.rotas += d.rotas;
    a.reservas += d.reservas;
  }
  return [...porDia.values()].sort((x, y) => x.dia.localeCompare(y.dia));
}

// Onde o perfil apareceu, do que mais para o que menos aconteceu
export function origensDasAparicoes(t: Totais): { chave: "busca_cel" | "maps_cel" | "busca_pc" | "maps_pc"; nome: string; n: number }[] {
  return [
    { chave: "busca_cel" as const, nome: "Busca do Google, no celular", n: t.busca_cel },
    { chave: "maps_cel" as const, nome: "Google Maps, no celular", n: t.maps_cel },
    { chave: "busca_pc" as const, nome: "Busca do Google, no computador", n: t.busca_pc },
    { chave: "maps_pc" as const, nome: "Google Maps, no computador", n: t.maps_pc },
  ].sort((a, b) => b.n - a.n);
}

// ---------------------------------------------------------------------------
// Janelas e comparações: os últimos N dias contra os N dias anteriores
// ---------------------------------------------------------------------------
export type Janela = {
  de: string;
  ate: string;
  diasComDado: number;
  completa: boolean; // tem os N dias
  totais: Totais;
};

export function janela(dias: DiaDesempenho[], ate: string, n: number): Janela {
  const de = somarDiasNaData(ate, -(n - 1));
  const dentro = dias.filter((d) => d.dia >= de && d.dia <= ate);
  return { de, ate, diasComDado: new Set(dentro.map((d) => d.dia)).size, completa: new Set(dentro.map((d) => d.dia)).size === n, totais: somar(dentro) };
}

export type Comparacao = { atual: Janela; anterior: Janela; n: number };

export function comparar(dias: DiaDesempenho[], ate: string, n = DIAS_DA_JANELA): Comparacao {
  return { atual: janela(dias, ate, n), anterior: janela(dias, somarDiasNaData(ate, -n), n), n };
}

export type Variacao = {
  delta: number;
  pct: number | null; // null quando a base é pequena demais para falar em percentual
  sentido: "subiu" | "caiu" | "igual";
};

export function variacao(atual: number, anterior: number): Variacao {
  const delta = atual - anterior;
  const pct = anterior >= BASE_MINIMA_PARA_PERCENTUAL ? Math.round((delta / anterior) * 100) : null;
  const igual = delta === 0 || (pct !== null && Math.abs(pct) < 1);
  return { delta, pct, sentido: igual ? "igual" : delta > 0 ? "subiu" : "caiu" };
}

// "subiu 18%", "caiu 3" ou "igual", seguido de com o que se compara
export function fraseDaVariacao(v: Variacao, contra: string): string {
  if (v.sentido === "igual") return `igual ${contra}`;
  const quanto = v.pct !== null ? `${Math.abs(v.pct)}%` : numeroBR(Math.abs(v.delta));
  return `${v.sentido} ${quanto} ${contra}`;
}

// Só dá para comparar quando as duas janelas têm todos os dias
export const podeComparar = (c: Comparacao) => c.atual.completa && c.anterior.completa;

// O último dia com número em qualquer cliente: é a ponta comum de todas as comparações
export function ultimoDiaComDado(dias: { dia: string }[]): string | null {
  let ultimo: string | null = null;
  for (const d of dias) if (ultimo === null || d.dia > ultimo) ultimo = d.dia;
  return ultimo;
}

// Janelas de comparação que o histórico já permite (7 dias precisa de 14 dias; 14 precisa de 28...)
export function janelasPossiveis(dias: { dia: string }[], opcoes = [7, 14, 28]): number[] {
  if (dias.length === 0) return [];
  const primeiro = dias.reduce((m, d) => (d.dia < m ? d.dia : m), dias[0].dia);
  const ultimo = ultimoDiaComDado(dias)!;
  const disponiveis = diasEntre(primeiro, ultimo) + 1;
  return opcoes.filter((n) => disponiveis >= 2 * n);
}

// ---------------------------------------------------------------------------
// Séries para os gráficos
// ---------------------------------------------------------------------------
export type PontoDia = { dia: string; valor: number | null };

// Um ponto por dia de `de` a `ate`; dia sem número fica como null (o gráfico mostra o buraco, não zero)
export function serieDiaria(dias: DiaDesempenho[], de: string, ate: string, valor: (d: DiaDesempenho) => number): PontoDia[] {
  const porDia = new Map(dias.map((d) => [d.dia, d]));
  const pontos: PontoDia[] = [];
  for (let dia = de; dia <= ate; dia = somarDiasNaData(dia, 1)) {
    const d = porDia.get(dia);
    pontos.push({ dia, valor: d ? valor(d) : null });
  }
  return pontos;
}

// Média dos últimos N dias em cada ponto; só aparece quando os N dias têm número
export function mediaMovel(pontos: PontoDia[], n = DIAS_DA_JANELA): (number | null)[] {
  return pontos.map((_, i) => {
    if (i < n - 1) return null;
    const grupo = pontos.slice(i - n + 1, i + 1);
    if (grupo.some((p) => p.valor === null)) return null;
    return grupo.reduce((s, p) => s + (p.valor as number), 0) / n;
  });
}

// ---------------------------------------------------------------------------
// Termos de busca
// ---------------------------------------------------------------------------
export type ResumoTermos = {
  mes: string;
  comNumero: { termo: string; usuarios: number }[]; // do mais buscado para o menos
  abaixoDoLimite: number; // quantos termos o Google só disse "menos que N pessoas"
  poucos: string[]; // esses termos, em ordem alfabética
  limite: number | null;
  total: number;
};

export function resumirTermos(termos: TermoBusca[], mes?: string): ResumoTermos | null {
  if (termos.length === 0) return null;
  const alvo = mes ?? termos.reduce((m, t) => (t.mes > m ? t.mes : m), termos[0].mes);
  const doMes = termos.filter((t) => t.mes === alvo);
  if (doMes.length === 0) return null;
  const comNumero = doMes
    .filter((t) => t.usuarios !== null)
    .map((t) => ({ termo: t.termo, usuarios: t.usuarios as number }))
    .sort((a, b) => b.usuarios - a.usuarios || a.termo.localeCompare(b.termo, "pt-BR"));
  const abaixo = doMes.filter((t) => t.usuarios === null);
  const limites = abaixo.map((t) => t.abaixo_de).filter((x): x is number => x !== null);
  const poucos = abaixo.map((t) => t.termo).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return { mes: alvo, comNumero, abaixoDoLimite: abaixo.length, poucos, limite: limites.length ? Math.max(...limites) : null, total: doMes.length };
}

// ---------------------------------------------------------------------------
// Marcas: os dias em que agimos no perfil (para ver o antes e o depois no gráfico)
// ---------------------------------------------------------------------------
export type MarcaAcao = { dia: string; n: number; tipos: string[] };

// Decisões, análises e anotações não mudam o perfil no Google; ação que falhou também não
const SEM_EFEITO_NO_PERFIL: ReadonlySet<string> = new Set(["analise", "decisao", "outro"]);

export function marcasDasAcoes(eventos: { ocorreu_em: string; tipo: string; ok: boolean }[], diaDe: (instante: string) => string): MarcaAcao[] {
  const porDia = new Map<string, MarcaAcao>();
  for (const e of eventos) {
    if (!e.ok || SEM_EFEITO_NO_PERFIL.has(e.tipo)) continue;
    const dia = diaDe(e.ocorreu_em);
    const marca = porDia.get(dia) ?? { dia, n: 0, tipos: [] };
    marca.n += 1;
    if (!marca.tipos.includes(e.tipo)) marca.tipos.push(e.tipo);
    porDia.set(dia, marca);
  }
  return [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia));
}

// ---------------------------------------------------------------------------
// Projeção: o que acontece nos próximos dias SE o ritmo recente continuar (uma estimativa, não uma promessa)
// ---------------------------------------------------------------------------
export const DIAS_DA_BASE_DA_PROJECAO = 14;
export const DIAS_DA_PROJECAO = 30;
export type Projecao = { esperado: number; minimo: number; maximo: number; horizonte: number; baseEmDias: number };

// Esperado: a média diária dos últimos 14 dias vezes o horizonte. Faixa: da pior à melhor média de 7 dias dos últimos 28 dias,
// que é o quanto o ritmo variou de verdade. Sem 14 dias seguidos até o último dia com número, não projeta.
export function projetar(dias: DiaDesempenho[], ate: string, valor: (d: DiaDesempenho) => number, horizonte = DIAS_DA_PROJECAO): Projecao | null {
  const porDia = new Map(dias.map((d) => [d.dia, valor(d)]));
  const base = DIAS_DA_BASE_DA_PROJECAO;
  let soma = 0;
  for (let i = 0; i < base; i++) {
    const v = porDia.get(somarDiasNaData(ate, -i));
    if (v === undefined) return null;
    soma += v;
  }
  const medias: number[] = [];
  for (let fim = 0; fim <= 21; fim++) {
    let s = 0;
    let completa = true;
    for (let k = 0; k < 7; k++) {
      const v = porDia.get(somarDiasNaData(ate, -(fim + k)));
      if (v === undefined) {
        completa = false;
        break;
      }
      s += v;
    }
    if (completa) medias.push(s / 7);
  }
  const ritmo = soma / base;
  return {
    esperado: Math.round(ritmo * horizonte),
    minimo: Math.round(Math.min(...medias, ritmo) * horizonte),
    maximo: Math.round(Math.max(...medias, ritmo) * horizonte),
    horizonte,
    baseEmDias: base,
  };
}

// ---------------------------------------------------------------------------
// De cada 100 aparições, quantas viraram ligação, pedido de rota ou clique no site
// ---------------------------------------------------------------------------
export const BASE_MINIMA_DE_APARICOES_PARA_TAXA = 100;
export type TaxaPorCem = { ligacoes: number; rotas: number; cliques_site: number };

export function porCemAparicoes(t: Totais): TaxaPorCem | null {
  if (t.aparicoes < BASE_MINIMA_DE_APARICOES_PARA_TAXA) return null;
  const por100 = (n: number) => Math.round((n / t.aparicoes) * 1000) / 10;
  return { ligacoes: por100(t.ligacoes), rotas: por100(t.rotas), cliques_site: por100(t.cliques_site) };
}

// ---------------------------------------------------------------------------
// Semana a semana (mapa de calor): cada semana contra a média do próprio perfil
// ---------------------------------------------------------------------------
export type Semana = { de: string; ate: string; total: number; completa: boolean };

// Blocos de 7 dias andando para trás a partir do último dia com número; do mais antigo para o mais novo.
// Semana sem nenhum dia não entra; semana pela metade entra marcada como incompleta.
export function semanasDosDias(dias: DiaDesempenho[], ate: string, quantas = 8): Semana[] {
  const semanas: Semana[] = [];
  for (let i = 0; i < quantas; i++) {
    const fim = somarDiasNaData(ate, -7 * i);
    const ini = somarDiasNaData(fim, -6);
    const dentro = dias.filter((d) => d.dia >= ini && d.dia <= fim);
    const diasComDado = new Set(dentro.map((d) => d.dia)).size;
    if (diasComDado === 0) break;
    semanas.push({ de: ini, ate: fim, total: somar(dentro).aparicoes, completa: diasComDado === 7 });
  }
  return semanas.reverse();
}

// 1 = bem abaixo da média do perfil, 3 = na média, 5 = bem acima
export function passoDoCalor(valor: number, media: number): 1 | 2 | 3 | 4 | 5 {
  if (media <= 0) return 3;
  const r = valor / media;
  if (r < 0.8) return 1;
  if (r < 0.95) return 2;
  if (r < 1.05) return 3;
  if (r < 1.2) return 4;
  return 5;
}

// ---------------------------------------------------------------------------
// Trabalho feito: quantas ações em cada grupo, num intervalo de dias
// ---------------------------------------------------------------------------
export function contarAcoes(
  eventos: { ocorreu_em: string; tipo: string; ok: boolean }[],
  de: string,
  ate: string,
  diaDe: (instante: string) => string,
  grupoDe: (tipo: string) => string,
): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const e of eventos) {
    if (!e.ok || SEM_EFEITO_NO_PERFIL.has(e.tipo)) continue;
    const dia = diaDe(e.ocorreu_em);
    if (dia < de || dia > ate) continue;
    const g = grupoDe(e.tipo);
    contagem.set(g, (contagem.get(g) ?? 0) + 1);
  }
  return contagem;
}

// ---------------------------------------------------------------------------
// Reputação: a leitura mais recente de cada cliente
// ---------------------------------------------------------------------------
export function reputacaoMaisRecente(lista: Reputacao[]): Map<string, Reputacao> {
  const mapa = new Map<string, Reputacao>();
  for (const r of lista) {
    const atual = mapa.get(r.cliente_id);
    if (!atual || r.dia > atual.dia) mapa.set(r.cliente_id, r);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Uma linha por cliente na visão geral
// ---------------------------------------------------------------------------
export type LinhaDesempenho = {
  clienteId: string;
  comparacao: Comparacao;
  aparicoes: Variacao | null;
  contatos: Variacao | null;
  semDados: boolean; // nenhum número na janela atual
  incompleta: boolean; // faltam dias na janela atual
};

export function linhaDoCliente(clienteId: string, dias: DiaDesempenho[], ate: string, n = DIAS_DA_JANELA): LinhaDesempenho {
  const comparacao = comparar(dias, ate, n);
  const comparavel = podeComparar(comparacao);
  return {
    clienteId,
    comparacao,
    aparicoes: comparavel ? variacao(comparacao.atual.totais.aparicoes, comparacao.anterior.totais.aparicoes) : null,
    contatos: comparavel ? variacao(comparacao.atual.totais.contatos, comparacao.anterior.totais.contatos) : null,
    semDados: comparacao.atual.diasComDado === 0,
    incompleta: comparacao.atual.diasComDado > 0 && !comparacao.atual.completa,
  };
}
