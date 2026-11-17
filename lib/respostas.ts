import type { DiaSemana, OpcaoEscolha, PayloadChoose, PayloadInput } from "./tipos";

export const DIAS: { chave: DiaSemana; nome: string; curto: string }[] = [
  { chave: "seg", nome: "Segunda-feira", curto: "Seg" },
  { chave: "ter", nome: "Terça-feira", curto: "Ter" },
  { chave: "qua", nome: "Quarta-feira", curto: "Qua" },
  { chave: "qui", nome: "Quinta-feira", curto: "Qui" },
  { chave: "sex", nome: "Sexta-feira", curto: "Sex" },
  { chave: "sab", nome: "Sábado", curto: "Sáb" },
  { chave: "dom", nome: "Domingo", curto: "Dom" },
];

// O que o navegador envia ao responder uma pendência (o servidor confere tudo de novo)
export type DiaHorario = { modo: "fechado" } | { modo: "24h" } | { modo: "horario"; abre: string; fecha: string };
export type Resposta =
  | { tipo: "choose"; valor: string; outro?: string }
  | { tipo: "input"; campo: string; valor: unknown }
  | { tipo: "upload"; midias: string[] };

export type Conferida = { erro: string } | { valor: unknown; resumo: string };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const limpar = (t: unknown, max: number) => String(t ?? "").trim().slice(0, max);

export function conferirEscolha(payload: PayloadChoose, r: { valor: string; outro?: string }): Conferida {
  const opcoes: OpcaoEscolha[] = payload.opcoes ?? [];
  if (r.valor === "outro") {
    const outro = limpar(r.outro, 500);
    if (!payload.permitir_outro) return { erro: "Esta pergunta não aceita outra resposta." };
    if (!outro) return { erro: "Escreva a sua resposta em “Outro”." };
    return { valor: { opcao: "outro", outro }, resumo: `Outro: ${outro}` };
  }
  const opcao = opcoes.find((o) => o.valor === r.valor);
  if (!opcao) return { erro: "Escolha uma das opções." };
  return { valor: { opcao: opcao.valor, rotulo: opcao.rotulo }, resumo: opcao.rotulo };
}

export function conferirEntrada(payload: PayloadInput, campo: string, valor: unknown): Conferida {
  if (payload.campo !== campo) return { erro: "Esta pendência pede outro tipo de resposta." };

  if (campo === "cidades") {
    const lista = (Array.isArray(valor) ? valor : []).map((c) => limpar(c, 60)).filter(Boolean);
    const unicas = [...new Set(lista)].slice(0, 30);
    if (!unicas.length) return { erro: "Informe ao menos uma cidade." };
    return { valor: unicas, resumo: `Cidades: ${unicas.join(", ")}` };
  }

  if (campo === "texto") {
    const texto = limpar(valor, 300);
    if (!texto) return { erro: "Escreva a resposta." };
    return { valor: texto, resumo: texto };
  }

  if (campo === "checklist") {
    const v = (valor ?? {}) as { marcados?: unknown; outro?: unknown };
    const permitidos = payload.opcoes ?? [];
    const marcados = (Array.isArray(v.marcados) ? v.marcados : []).map((m) => String(m)).filter((m) => permitidos.includes(m));
    const outro = limpar(v.outro, 200);
    const todos = [...new Set(marcados), ...(outro ? [outro] : [])];
    return {
      valor: { marcados: [...new Set(marcados)], ...(outro ? { outro } : {}) },
      resumo: todos.length ? `Vale: ${todos.join(", ")}` : "Nenhum deles vale",
    };
  }

  if (campo === "horario") {
    const dias = payload.dias?.length ? payload.dias : DIAS.map((d) => d.chave);
    const v = (valor ?? {}) as Record<string, DiaHorario | undefined>;
    const saida: Record<string, DiaHorario> = {};
    const partes: string[] = [];
    for (const chave of dias) {
      const d = v[chave];
      const nome = DIAS.find((x) => x.chave === chave)?.curto ?? chave;
      if (!d) return { erro: `Escolha o horário de ${nome}.` };
      if (d.modo === "fechado") {
        saida[chave] = { modo: "fechado" };
        partes.push(`${nome} fechado`);
      } else if (d.modo === "24h") {
        saida[chave] = { modo: "24h" };
        partes.push(`${nome} 24 horas`);
      } else if (d.modo === "horario") {
        if (!HORA.test(d.abre ?? "") || !HORA.test(d.fecha ?? "")) return { erro: `Preencha a hora de abrir e de fechar de ${nome}.` };
        if (d.abre >= d.fecha) return { erro: `${nome}: a hora de fechar precisa ser depois da hora de abrir.` };
        saida[chave] = { modo: "horario", abre: d.abre, fecha: d.fecha };
        partes.push(`${nome} ${d.abre} às ${d.fecha}`);
      } else {
        return { erro: `Horário inválido em ${nome}.` };
      }
    }
    return { valor: saida, resumo: partes.join("; ") };
  }

  return { erro: "Tipo de resposta desconhecido." };
}
