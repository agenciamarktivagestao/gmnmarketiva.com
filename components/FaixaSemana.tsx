import type { Dia } from "@/lib/semana";

// Os sete dias de um cliente numa linha: quantas ações houve em cada um
export function FaixaSemana({ dias, porDia }: { dias: Dia[]; porDia: Record<string, number> }) {
  return (
    <ol className="faixa" aria-label="Ações por dia">
      {dias.map((d) => {
        const n = porDia[d.chave] ?? 0;
        return (
          <li key={d.chave} className={n > 0 ? "faixa-tem" : undefined}>
            <span className="faixa-dia" aria-hidden="true">
              {d.curto}
            </span>
            <strong aria-hidden="true">{n > 0 ? n : "·"}</strong>
            <span className="sr-only">
              {d.longo}: {n === 0 ? "nenhuma ação" : n === 1 ? "1 ação" : `${n} ações`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
