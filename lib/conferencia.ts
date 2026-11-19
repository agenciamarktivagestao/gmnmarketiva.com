import type { Evento } from "./tipos";

// Conferência no Google: uma ação só vale como feita de verdade depois que alguém reler o perfil no Google
// e confirmar que ficou lá. A rotina (ou a equipe) preenche `conferido_em` nessa hora.
// Fica de fora o que não mexe no Google: decisões da equipe, análises e anotações. Ao contrário de uma lista
// "só estes tipos", todo tipo novo que a rotina passar a registrar já nasce como "falta conferir".
const SEM_GOOGLE: ReadonlySet<string> = new Set(["analise", "decisao", "outro"]);

export type EstadoConferencia = "conferido" | "falta" | null;

type Parte = Pick<Evento, "tipo" | "ok" | "conferido_em">;

// null = não se aplica (não mexeu no Google, ou falhou antes de chegar lá)
export function estadoConferencia(e: Parte): EstadoConferencia {
  if (SEM_GOOGLE.has(e.tipo) || !e.ok) return null;
  return e.conferido_em ? "conferido" : "falta";
}

export type ResumoConferencia = { conferidas: number; faltam: number };

export function contarConferencia(eventos: Parte[]): ResumoConferencia {
  const r: ResumoConferencia = { conferidas: 0, faltam: 0 };
  for (const e of eventos) {
    const estado = estadoConferencia(e);
    if (estado === "conferido") r.conferidas += 1;
    else if (estado === "falta") r.faltam += 1;
  }
  return r;
}
