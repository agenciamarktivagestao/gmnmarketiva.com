import { diaCurto } from "@/lib/desempenho";
import { fraseDaMudanca } from "@/lib/ranking";
import type { Mudanca } from "@/lib/ranking";

const SETA = { subiu: "▲", caiu: "▼", igual: "=" } as const;

// "▲ subiu 12 pontos no top 3": a seta, a palavra e o número dizem a mesma coisa, então nada depende só da cor.
// "Subiu" quer dizer que o perfil está melhor colocado.
export function MudancaNoRanking({ mudanca }: { mudanca: Mudanca | null }) {
  if (mudanca === null) return <span className="variacao variacao-sem">primeira medição, ainda sem com o que comparar</span>;
  if (!mudanca.comparavel) return <span className="variacao variacao-sem">não dá para comparar: {mudanca.motivo}</span>;
  return (
    <span className={`variacao variacao-${mudanca.sentido}`}>
      <span aria-hidden="true">{SETA[mudanca.sentido]}</span> {fraseDaMudanca(mudanca)}
      <span className="sr-only"> em relação à medição de {diaCurto(mudanca.anteriorDia)}</span>
    </span>
  );
}
