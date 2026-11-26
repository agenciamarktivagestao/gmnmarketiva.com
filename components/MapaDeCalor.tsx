import Link from "next/link";
import { numeroBR, passoDoCalor } from "@/lib/desempenho";
import type { Semana } from "@/lib/desempenho";

export type LinhaDoCalor = { nome: string; href: string; semanas: Semana[] };

const textoDaSemana = (s: Semana) => `de ${s.de.slice(8)}/${s.de.slice(5, 7)} a ${s.ate.slice(8)}/${s.ate.slice(5, 7)}`;

// Cliente por semana. A cor compara cada semana com a média do próprio cliente (não com os outros), então mostra se ele está subindo ou caindo,
// não quem é maior. O número está em toda célula: a cor nunca é a única informação.
export function MapaDeCalor({ colunas, linhas, rotulo }: { colunas: { de: string; ate: string }[]; linhas: LinhaDoCalor[]; rotulo: string }) {
  return (
    <div>
      <div className="calor-rolagem">
        <table className="calor">
          <caption className="sr-only">{rotulo}</caption>
          <thead>
            <tr>
              <th scope="col">Cliente</th>
              {colunas.map((c) => (
                <th scope="col" key={c.de}>
                  {c.de.slice(8)} a {c.ate.slice(8)}/{c.ate.slice(5, 7)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const completas = l.semanas.filter((s) => s.completa);
              const media = completas.length > 0 ? completas.reduce((s, x) => s + x.total, 0) / completas.length : 0;
              const porInicio = new Map(l.semanas.map((s) => [s.de, s]));
              return (
                <tr key={l.href}>
                  <th scope="row">
                    <Link href={l.href}>{l.nome}</Link>
                  </th>
                  {colunas.map((c) => {
                    const s = porInicio.get(c.de);
                    if (!s) return <td key={c.de} className="calor-vazio"><span aria-hidden="true">–</span><span className="sr-only">sem número nesta semana</span></td>;
                    if (!s.completa)
                      return (
                        <td key={c.de} className="calor-parcial" title="Semana com menos de 7 dias de número">
                          {numeroBR(s.total)}
                          <span className="sr-only"> aparições, semana {textoDaSemana(s)} incompleta</span>
                        </td>
                      );
                    const passo = passoDoCalor(s.total, media);
                    return (
                      <td key={c.de} className={`calor-${passo}`}>
                        {numeroBR(s.total)}
                        <span className="sr-only"> aparições, semana {textoDaSemana(s)}, {["muito abaixo", "abaixo", "na média", "acima", "muito acima"][passo - 1]} da média deste cliente</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="calor-legenda" aria-hidden="true">
        <li>abaixo da média do cliente</li>
        {[1, 2, 3, 4, 5].map((p) => (
          <li key={p} className={`calor-chave calor-${p}`} />
        ))}
        <li>acima</li>
      </ul>
    </div>
  );
}
