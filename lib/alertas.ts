import type { Semana } from "./semana";
import type { Evento } from "./tipos";

// O que pede atenção no Painel: a rotina que não registrou nada, ações que falharam e clientes sem nenhuma ação.
// Recebe a semana já montada (ver semana.ts). Este arquivo só importa tipos de outros: os testes rodam direto no Node.

export const DIAS_DE_FALHA = 3; // uma falha mais antiga que isso deixa de aparecer
export const MAX_FALHAS = 5; // quantas falhas listar (o total sempre é contado)
export const HORA_LIMITE_DA_ROTINA = 5; // a rotina termina até as 04:30; depois das 05:00 ela já devia ter registrado a noite

export type Atencao = {
  // null = a rotina registrou a noite que devia (ou está pausada de propósito, o que o Painel avisa à parte)
  rotina: { noites: number; ultima: string | null } | null;
  falhas: { total: number; recentes: Evento[] };
  semAcao: string[]; // ids dos clientes sem nenhuma ação nos últimos 7 dias
};

export const nadaPedeAtencao = (a: Atencao) => a.rotina === null && a.falhas.total === 0 && a.semAcao.length === 0;

export function calcularAtencao(entrada: {
  semana: Semana; // montarSemana(...): sete dias, do mais antigo até hoje
  clienteIds: string[];
  pausados?: ReadonlySet<string>; // clientes pausados na tela Rotina: ficar sem ação é esperado
  rotinaAtiva: boolean;
  passouDoPrazo: boolean; // já passou das 05:00 de hoje em Brasília (HORA_LIMITE_DA_ROTINA)
}): Atencao {
  const { semana, clienteIds, pausados, rotinaAtiva, passouDoPrazo } = entrada;
  const chaves = semana.dias.map((d) => d.chave);

  // Rotina: a última noite que ela devia ter registrado é a de hoje (depois do prazo) ou a de ontem
  const devida = chaves.length - (passouDoPrazo ? 1 : 2);
  let ultimoDia = -1;
  chaves.forEach((c, i) => {
    if (semana.porDia[c].some((e) => e.origem === "rotina")) ultimoDia = i;
  });
  const rotina = rotinaAtiva && ultimoDia < devida ? { noites: devida - ultimoDia, ultima: semana.ultimaRotina } : null;

  // Falhas dos últimos dias, as mais recentes primeiro
  const falhas = chaves
    .slice(-DIAS_DE_FALHA)
    .flatMap((c) => semana.porDia[c])
    .filter((e) => !e.ok)
    .sort((a, b) => Date.parse(b.ocorreu_em) - Date.parse(a.ocorreu_em));

  // Clientes sem nenhuma ação na semana
  const comAcao = new Set(semana.eventos.map((e) => e.cliente_id));
  const semAcao = clienteIds.filter((id) => !comAcao.has(id) && !pausados?.has(id));

  return { rotina, falhas: { total: falhas.length, recentes: falhas.slice(0, MAX_FALHAS) }, semAcao };
}
