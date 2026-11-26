import type { ReactNode } from "react";
import { FaixaDaProjecao } from "@/components/FaixaDaProjecao";
import { Tendencia } from "@/components/Tendencia";
import { Variacao } from "@/components/Variacao";
import { numeroBR } from "@/lib/desempenho";
import type { Projecao, Variacao as VariacaoDados } from "@/lib/desempenho";

export type ItemDoResumo = {
  nome: string;
  valor: number | string;
  variacao?: VariacaoDados | null;
  serie?: (number | null)[];
  rotuloDaSerie?: string;
  projecao?: Projecao | null;
  unidade?: string; // "aparições": entra só no texto para leitor de tela da projeção
  detalhe?: ReactNode; // linha de apoio (por exemplo, o total de avaliações)
};

// Faixa preta com os números que abrem a tela: o valor, a variação, o traço dos dias e a projeção.
export function ResumoDesempenho({ itens, contra, rotulo }: { itens: ItemDoResumo[]; contra: string; rotulo: string }) {
  return (
    <dl className="desempenho-resumo" aria-label={rotulo}>
      {itens.map((i) => (
        <div key={i.nome}>
          <dt>{i.nome}</dt>
          <dd className="desempenho-resumo-valor">{typeof i.valor === "number" ? numeroBR(i.valor) : i.valor}</dd>
          {i.variacao !== undefined && (
            <dd className="desempenho-resumo-var">
              <Variacao v={i.variacao} contra={contra} />
            </dd>
          )}
          {i.detalhe && <dd className="desempenho-resumo-detalhe">{i.detalhe}</dd>}
          {i.serie && i.rotuloDaSerie && (
            <dd className="desempenho-resumo-traco">
              <Tendencia valores={i.serie} rotulo={i.rotuloDaSerie} largura={170} altura={44} cor="var(--azul-vivo)" anel="var(--preto)" preencher />
            </dd>
          )}
          {i.projecao && i.projecao.maximo > 0 && (
            <dd className="desempenho-resumo-projecao">
              <FaixaDaProjecao p={i.projecao} unidade={i.unidade ?? ""} />
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
