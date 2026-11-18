import type { Evento } from "./tipos";

// A visão "Últimos 7 dias": junta o histórico em dias e em grupos de ação.
// Tudo é calculado no horário de Brasília, porque é nele que a equipe e o cliente enxergam o dia.
// Este arquivo só importa tipos de outros: os testes rodam direto no Node.

export const FUSO = "America/Sao_Paulo";
export const JANELA_ROTINA = "das 02:30 às 04:30";
export const DIAS_DA_SEMANA = 7;

export type GrupoChave = "fotos" | "servicos" | "postagens" | "respostas" | "perfil" | "decisoes";

// Os seis grupos do mapa. Cada tipo do histórico cai em um deles; o que não for conhecido vai para "decisoes".
export const GRUPOS: { chave: GrupoChave; nome: string; tipos: string[] }[] = [
  { chave: "fotos", nome: "Fotos", tipos: ["foto"] },
  { chave: "servicos", nome: "Serviços", tipos: ["servico"] },
  { chave: "postagens", nome: "Postagens", tipos: ["post"] },
  { chave: "respostas", nome: "Respostas", tipos: ["resposta"] },
  { chave: "perfil", nome: "Dados do perfil", tipos: ["descricao", "categoria", "area"] },
  { chave: "decisoes", nome: "Decisões e conferências", tipos: ["decisao", "analise", "outro"] },
];

export const grupoDoTipo = (tipo: string): GrupoChave => GRUPOS.find((g) => g.tipos.includes(tipo))?.chave ?? "decisoes";

export const ORIGEM: Record<string, string> = { rotina: "Rotina", equipe: "Equipe", analise: "Análise" };

const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

// "2026-11-18": o dia em que o instante cai, no horário de Brasília
export const diaChave = (instante: Date | string): string =>
  formatoDia.format(typeof instante === "string" ? new Date(instante) : instante);

export type Dia = {
  chave: string; // AAAA-MM-DD
  curto: string; // "qua"
  numero: string; // "18"
  longo: string; // "quarta-feira, 18 de novembro"
  hoje: boolean;
};

// Do dia mais antigo para o de hoje
export function ultimosDias(agora: Date | string, n = DIAS_DA_SEMANA): Dia[] {
  const base = Date.parse(`${diaChave(agora)}T12:00:00Z`); // meio-dia evita virar o dia por causa do fuso
  const dias: Dia[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base - i * 86_400_000);
    const chave = diaChave(d);
    dias.push({
      chave,
      curto: d.toLocaleDateString("pt-BR", { weekday: "short", timeZone: FUSO }).replace(".", ""),
      numero: String(Number(chave.slice(8))),
      longo: d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSO }),
      hoje: i === 0,
    });
  }
  return dias;
}

// Desde quando buscar no banco: um dia a mais que a janela, porque o corte exato por dia é feito em montarSemana
export const inicioDaBusca = (agora: Date, n = DIAS_DA_SEMANA) => new Date(agora.getTime() - (n + 1) * 86_400_000).toISOString();

const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

// "hoje, 03:12", "ontem, 03:12" ou "15/11, 03:12": quando algo aconteceu, em palavras que a equipe e o cliente usam
export function quandoFoi(instante: string, dias: Dia[]): string {
  const chave = diaChave(instante);
  const hora = formatoHora.format(new Date(instante));
  if (chave === dias.at(-1)?.chave) return `hoje, ${hora}`;
  if (chave === dias.at(-2)?.chave) return `ontem, ${hora}`;
  return `${chave.slice(8)}/${chave.slice(5, 7)}, ${hora}`;
}

export type Celula = { n: number; falhas: number };

export type Semana = {
  dias: Dia[];
  eventos: Evento[]; // só os da janela, do mais recente para o mais antigo
  porDia: Record<string, Evento[]>;
  celulas: Record<GrupoChave, Record<string, Celula>>;
  totalPorDia: Record<string, number>;
  total: number;
  falhas: number;
  daRotina: number;
  daEquipe: number;
  ultimaRotina: string | null; // quando a rotina agiu pela última vez dentro da janela
};

const maisRecentePrimeiro = (a: Evento, b: Evento) => Date.parse(b.ocorreu_em) - Date.parse(a.ocorreu_em);

export function montarSemana(eventos: Evento[], agora: Date | string, n = DIAS_DA_SEMANA): Semana {
  const dias = ultimosDias(agora, n);
  const chaves = new Set(dias.map((d) => d.chave));
  const dentro = eventos.filter((e) => chaves.has(diaChave(e.ocorreu_em))).sort(maisRecentePrimeiro);

  const porDia: Record<string, Evento[]> = Object.fromEntries(dias.map((d) => [d.chave, [] as Evento[]]));
  const totalPorDia: Record<string, number> = Object.fromEntries(dias.map((d) => [d.chave, 0]));
  const celulas = Object.fromEntries(
    GRUPOS.map((g) => [g.chave, Object.fromEntries(dias.map((d) => [d.chave, { n: 0, falhas: 0 }]))]),
  ) as Semana["celulas"];

  let falhas = 0;
  let daRotina = 0;
  let daEquipe = 0;
  for (const e of dentro) {
    const dia = diaChave(e.ocorreu_em);
    porDia[dia].push(e);
    totalPorDia[dia] += 1;
    const celula = celulas[grupoDoTipo(e.tipo)][dia];
    celula.n += 1;
    if (!e.ok) {
      celula.falhas += 1;
      falhas += 1;
    }
    if (e.origem === "rotina") daRotina += 1;
    if (e.origem === "equipe") daEquipe += 1;
  }

  return {
    dias,
    eventos: dentro,
    porDia,
    celulas,
    totalPorDia,
    total: dentro.length,
    falhas,
    daRotina,
    daEquipe,
    ultimaRotina: dentro.find((e) => e.origem === "rotina")?.ocorreu_em ?? null,
  };
}

export type ResumoCliente = {
  total: number;
  falhas: number;
  porDia: Record<string, number>;
  ultimo: string | null; // a ação mais recente da janela
};

export const SEM_CLIENTE = "geral";

// Uma linha por cliente (chave = id do cliente; ações sem cliente ficam em "geral"), para a visão geral da semana
export function resumirPorCliente(semana: Semana): Record<string, ResumoCliente> {
  const resumo: Record<string, ResumoCliente> = {};
  for (const e of semana.eventos) {
    const chave = e.cliente_id ?? SEM_CLIENTE;
    const r = (resumo[chave] ??= { total: 0, falhas: 0, porDia: Object.fromEntries(semana.dias.map((d) => [d.chave, 0])), ultimo: null });
    r.total += 1;
    if (!e.ok) r.falhas += 1;
    r.porDia[diaChave(e.ocorreu_em)] += 1;
    r.ultimo ??= e.ocorreu_em; // os eventos já vêm do mais recente para o mais antigo
  }
  return resumo;
}

// Os eventos de um dia, agrupados por cliente (a ordem dos clientes segue a lista recebida; "geral" por último)
export function agruparDiaPorCliente(eventos: Evento[], ordemClientes: string[]): { clienteId: string | null; eventos: Evento[] }[] {
  const mapa = new Map<string, Evento[]>();
  for (const e of eventos) mapa.set(e.cliente_id ?? SEM_CLIENTE, [...(mapa.get(e.cliente_id ?? SEM_CLIENTE) ?? []), e]);
  const grupos = ordemClientes.filter((id) => mapa.has(id)).map((id) => ({ clienteId: id as string | null, eventos: mapa.get(id)! }));
  const desconhecidos = [...mapa.keys()].filter((k) => k !== SEM_CLIENTE && !ordemClientes.includes(k));
  desconhecidos.forEach((id) => grupos.push({ clienteId: id, eventos: mapa.get(id)! }));
  if (mapa.has(SEM_CLIENTE)) grupos.push({ clienteId: null, eventos: mapa.get(SEM_CLIENTE)! });
  return grupos;
}

// O relatório que vai para o cliente mostra o trabalho entregue. Ficam de fora o que não deu certo (a rotina tenta de novo
// e o resultado aparece depois) e as anotações internas: decisões da equipe, análises e o que não tem tipo definido.
export const TIPOS_INTERNOS = ["decisao", "analise", "outro"];

export const paraOCliente = (eventos: Evento[]): Evento[] => eventos.filter((e) => e.ok && !TIPOS_INTERNOS.includes(e.tipo));

// "12/11 a 18/11/2026" (mesmo ano) ou "28/12/2026 a 03/01/2027" (virada de ano)
export function periodoEmTexto(dias: Dia[]): string {
  if (dias.length === 0) return "";
  const a = dias[0].chave;
  const b = dias[dias.length - 1].chave;
  const dm = (c: string) => `${c.slice(8)}/${c.slice(5, 7)}`;
  return a.slice(0, 4) === b.slice(0, 4) ? `${dm(a)} a ${dm(b)}/${b.slice(0, 4)}` : `${dm(a)}/${a.slice(0, 4)} a ${dm(b)}/${b.slice(0, 4)}`;
}

// Quantas ações de cada tipo houve (todos os seis grupos aparecem, mesmo com zero)
export function contarPorGrupo(eventos: Evento[]): { chave: GrupoChave; nome: string; n: number }[] {
  return GRUPOS.map((g) => ({ chave: g.chave, nome: g.nome, n: eventos.filter((e) => grupoDoTipo(e.tipo) === g.chave).length }));
}
