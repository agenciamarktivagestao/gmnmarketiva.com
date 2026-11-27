import type { Cliente } from "./tipos";

// Alertas de avaliação ruim. Este arquivo só importa tipos de outros: os testes rodam direto no Node.
// Quem decide o que é "ruim" é a rotina da madrugada: nota de 3 estrelas ou menos, ou comentário negativo mesmo com nota 4 ou 5.
// O painel só mostra o que a rotina gravou e deixa a equipe marcar como tratada.

export const NOTA_DE_ALERTA = 3; // nota igual ou menor que isto sempre vira alerta
export const DIAS_DAS_TRATADAS = 30; // quanto tempo uma avaliação tratada continua na lista
export const LIMITE_DESFECHO = 300;

export type MotivoAlerta = "nota" | "comentario" | "nota_e_comentario";
export type SituacaoAlerta = "nova" | "tratada";

export type AlertaAvaliacao = {
  id: string;
  cliente_id: string;
  review_id: string | null;
  avaliador: string;
  estrelas: number;
  texto: string | null;
  avaliada_em: string | null; // AAAA-MM-DD
  motivo: MotivoAlerta;
  motivo_detalhe: string | null;
  situacao: SituacaoAlerta;
  detectada_em: string; // ISO
  tratada_em: string | null;
  tratada_por: string | null;
  desfecho: string | null;
};

export const MOTIVOS: Record<MotivoAlerta, string> = {
  nota: "Nota baixa",
  comentario: "Comentário negativo",
  nota_e_comentario: "Nota baixa e comentário negativo",
};

export const motivoRotulo = (m: MotivoAlerta) => MOTIVOS[m] ?? MOTIVOS.nota;

// Primeiro a nota mais baixa, depois a mais recente
const maisUrgente = (a: AlertaAvaliacao, b: AlertaAvaliacao) =>
  a.estrelas - b.estrelas || Date.parse(b.detectada_em) - Date.parse(a.detectada_em);

export type GrupoDoCliente = { cliente: Cliente; novas: AlertaAvaliacao[]; tratadas: AlertaAvaliacao[] };

// Separa o que espera decisão do que já foi tratado (as tratadas só até DIAS_DAS_TRATADAS atrás)
export function separarAlertas(alertas: AlertaAvaliacao[], agora: Date | string | number = Date.now()) {
  const limite = new Date(agora).getTime() - DIAS_DAS_TRATADAS * 86_400_000;
  const novas = alertas.filter((a) => a.situacao === "nova").sort(maisUrgente);
  const tratadas = alertas
    .filter((a) => a.situacao === "tratada" && Date.parse(a.tratada_em ?? a.detectada_em) >= limite)
    .sort((a, b) => Date.parse(b.tratada_em ?? b.detectada_em) - Date.parse(a.tratada_em ?? a.detectada_em));
  return { novas, tratadas };
}

// Um grupo por cliente que tem alerta (clientes sem alerta ficam de fora): quem tem mais novas vem primeiro
export function agruparPorCliente(alertas: AlertaAvaliacao[], clientes: Cliente[], agora?: Date | string | number): GrupoDoCliente[] {
  const { novas, tratadas } = separarAlertas(alertas, agora);
  return clientes
    .map((cliente) => ({
      cliente,
      novas: novas.filter((a) => a.cliente_id === cliente.id),
      tratadas: tratadas.filter((a) => a.cliente_id === cliente.id),
    }))
    .filter((g) => g.novas.length + g.tratadas.length > 0)
    .sort((a, b) => b.novas.length - a.novas.length || a.cliente.nome.localeCompare(b.cliente.nome, "pt-BR"));
}

// Quantas esperam decisão, por nota: serve para o resumo no topo da página
export function contarPorNota(novas: AlertaAvaliacao[]) {
  const porNota: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  novas.forEach((a) => {
    porNota[a.estrelas] = (porNota[a.estrelas] ?? 0) + 1;
  });
  return porNota;
}

// O que a equipe escreve ao marcar como tratada: sem espaços sobrando e no máximo LIMITE_DESFECHO caracteres
export function limparDesfecho(texto: unknown): string {
  return String(texto ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITE_DESFECHO);
}
