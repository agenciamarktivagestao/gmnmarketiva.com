import { fraseDaVariacao } from "@/lib/desempenho";
import type { Variacao as VariacaoDados } from "@/lib/desempenho";

const SETA = { subiu: "▲", caiu: "▼", igual: "=" } as const;

// "▲ subiu 18%": a seta, a palavra e o número dizem a mesma coisa, então nada depende só da cor.
// `contra` entra só para leitor de tela ("em relação aos 7 dias anteriores"); na tela ele já está na legenda do bloco.
export function Variacao({ v, contra }: { v: VariacaoDados | null; contra: string }) {
  if (v === null) return <span className="variacao variacao-sem">sem semana anterior para comparar</span>;
  const curto = fraseDaVariacao(v, "").trim();
  return (
    <span className={`variacao variacao-${v.sentido}`}>
      <span aria-hidden="true">{SETA[v.sentido]}</span> {curto}
      <span className="sr-only"> {contra}</span>
    </span>
  );
}
