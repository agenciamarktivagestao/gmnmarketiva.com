import { numeroBR } from "@/lib/desempenho";
import type { Projecao } from "@/lib/desempenho";

// A projeção em uma linha e uma faixa: onde o ritmo recente leva os próximos dias.
// É uma estimativa: a faixa vai do pior ao melhor ritmo de 7 dias dos últimos 28 dias.
export function FaixaDaProjecao({ p, unidade }: { p: Projecao; unidade: string }) {
  const topo = Math.max(p.maximo, 1) * 1.08;
  const esq = (p.minimo / topo) * 100;
  const dir = (p.maximo / topo) * 100;
  const meio = (p.esperado / topo) * 100;
  return (
    <div className="projecao">
      <p className="projecao-texto">
        Em {p.horizonte} dias, no ritmo atual: <strong>cerca de {numeroBR(p.esperado)}</strong>
      </p>
      <span className="projecao-faixa" aria-hidden="true">
        <span className="projecao-intervalo" style={{ left: `${esq}%`, width: `${Math.max(dir - esq, 1.5)}%` }} />
        <span className="projecao-marca" style={{ left: `${meio}%` }} />
      </span>
      <p className="projecao-faixa-texto">
        Entre {numeroBR(p.minimo)} e {numeroBR(p.maximo)}
        <span className="sr-only">
          {" "}
          {unidade}, se o ritmo dos últimos {p.baseEmDias} dias continuar. É uma estimativa, não uma garantia.
        </span>
      </p>
    </div>
  );
}
