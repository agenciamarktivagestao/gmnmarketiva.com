import { Tendencia } from "@/components/Tendencia";
import { Variacao } from "@/components/Variacao";
import { numeroBR } from "@/lib/desempenho";
import type { Variacao as VariacaoDados } from "@/lib/desempenho";

export type ItemDoResumo = {
  nome: string;
  valor: number;
  variacao: VariacaoDados | null;
  serie: (number | null)[];
  rotuloDaSerie: string;
};

// Os números que abrem a tela: o que aconteceu nos últimos 7 dias, a variação e o traço dos dias
export function ResumoDesempenho({ itens, contra, rotulo }: { itens: ItemDoResumo[]; contra: string; rotulo: string }) {
  return (
    <dl className="desempenho-resumo" aria-label={rotulo}>
      {itens.map((i) => (
        <div key={i.nome}>
          <dt>{i.nome}</dt>
          <dd>{numeroBR(i.valor)}</dd>
          <dd className="desempenho-resumo-var">
            <Variacao v={i.variacao} contra={contra} />
          </dd>
          <dd className="desempenho-resumo-traco">
            <Tendencia valores={i.serie} rotulo={i.rotuloDaSerie} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
