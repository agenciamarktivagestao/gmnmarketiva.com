import Link from "next/link";
import { diaCompleto, numeroBR } from "@/lib/desempenho";
import { fraseDoCliente } from "@/lib/ranking";
import type { ResumoDoCliente } from "@/lib/ranking";

export type LinhaDoRanking = { nome: string; href: string; resumo: ResumoDoCliente };

const SETA = { subiu: "▲", caiu: "▼", igual: "=" } as const;
const percentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const posicaoMedia = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const plural = (n: number, um: string, varios: string) => `${numeroBR(n)} ${n === 1 ? um : varios}`;

// Todos os clientes lado a lado: presença no top 3, posição média e se subiu ou caiu desde a medição anterior.
// Com mais de uma palavra por cliente, os números são a média das palavras. O detalhe de cada palavra está no Desempenho do cliente.
export function QuadroDoRanking({ linhas, semMedicao }: { linhas: LinhaDoRanking[]; semMedicao: { nome: string; href: string }[] }) {
  const contar = (s: "subiu" | "caiu" | "igual") => linhas.filter((l) => l.resumo.sentido === s).length;
  const primeiras = linhas.filter((l) => l.resumo.sentido === null).length;
  return (
    <div>
      <p className="ranking-resumo">
        {plural(linhas.length, "cliente medido", "clientes medidos")}: <strong>{contar("subiu")}</strong> {contar("subiu") === 1 ? "subiu" : "subiram"}, <strong>{contar("caiu")}</strong>{" "}
        {contar("caiu") === 1 ? "caiu" : "caíram"}, <strong>{contar("igual")}</strong> {contar("igual") === 1 ? "ficou igual" : "ficaram iguais"}
        {primeiras > 0 && <>, {plural(primeiras, "está na primeira medição", "estão na primeira medição")}</>}.
      </p>
      <div className="desempenho-tabela-rolagem">
        <table className="desempenho-tabela ranking-tabela">
          <caption className="sr-only">Posição de cada cliente no Google Maps na última medição e o que mudou desde a anterior</caption>
          <thead>
            <tr>
              <th scope="col">Cliente</th>
              <th scope="col">No top 3</th>
              <th scope="col">Posição média</th>
              <th scope="col">Desde a medição anterior</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ nome, href, resumo: r }) => (
              <tr key={href}>
                <th scope="row">
                  <Link href={href}>{nome}</Link>
                  {r.palavras.length > 1 && <small className="ranking-palavras"> {r.palavras.length} palavras</small>}
                </th>
                <td>{r.solvMedio === null ? "–" : `${percentual.format(r.solvMedio)}%`}</td>
                <td>{r.arpMedio === null ? "–" : posicaoMedia.format(r.arpMedio)}</td>
                <td className="ranking-mudou">
                  {r.sentido === null ? (
                    <span className="variacao variacao-sem">primeira medição</span>
                  ) : (
                    <span className={`variacao variacao-${r.sentido}`}>
                      <span aria-hidden="true">{SETA[r.sentido]}</span> {fraseDoCliente(r)}
                    </span>
                  )}
                  {r.misto && <small className="ranking-quando">algumas palavras subiram e outras caíram</small>}
                  <small className="ranking-quando">medido em {diaCompleto(r.ultimoDia)}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {semMedicao.length > 0 && (
        <p className="dash-dica ranking-sem">
          Ainda sem medição:{" "}
          {semMedicao.map((c, i) => (
            <span key={c.href}>
              {i > 0 && ", "}
              <Link href={c.href} className="link-secao">
                {c.nome}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
    </div>
  );
}
