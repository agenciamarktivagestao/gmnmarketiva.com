import { GRUPOS } from "@/lib/semana";
import type { Semana } from "@/lib/semana";

// Os seis tipos de ação nas linhas e os sete dias nas colunas. O número diz quantas ações houve;
// a falha aparece com "!" e com texto para leitor de tela, então nada depende só da cor.
export function MapaSemana({ semana, legenda }: { semana: Semana; legenda: string }) {
  return (
    <>
      <table className="mapa">
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Tipo de ação</span>
            </th>
            {semana.dias.map((d) => (
              <th scope="col" key={d.chave} className={d.hoje ? "mapa-hoje" : undefined}>
                <a href={`#dia-${d.chave}`} aria-label={`${d.longo}${d.hoje ? " (hoje)" : ""}: ver o que foi feito`}>
                  <span className="mapa-dia">{d.curto}</span>
                  <span className="mapa-num">{d.numero}</span>
                </a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GRUPOS.map((g) => (
            <tr key={g.chave}>
              <th scope="row">{g.nome}</th>
              {semana.dias.map((d) => {
                const c = semana.celulas[g.chave][d.chave];
                return (
                  <td key={d.chave} className={d.hoje ? "mapa-hoje" : undefined}>
                    {c.n === 0 ? (
                      <>
                        <span className="mapa-zero" aria-hidden="true">
                          ·
                        </span>
                        <span className="sr-only">nenhuma</span>
                      </>
                    ) : (
                      <span className={`mapa-n mapa-n-${c.n >= 6 ? 3 : c.n >= 3 ? 2 : 1}${c.falhas > 0 ? " mapa-n-falha" : ""}`}>
                        {c.n}
                        {c.falhas > 0 && <span aria-hidden="true">!</span>}
                        <span className="sr-only">
                          {c.n === 1 ? " ação" : " ações"}
                          {c.falhas > 0 && (c.falhas === 1 ? ", 1 falhou" : `, ${c.falhas} falharam`)}
                        </span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total do dia</th>
            {semana.dias.map((d) => (
              <td key={d.chave} className={d.hoje ? "mapa-hoje" : undefined}>
                <strong>{semana.totalPorDia[d.chave]}</strong>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <p className="mapa-legenda">
        Quanto mais forte o azul, mais ações no dia. O contorno preto com ! marca um tipo de ação que falhou nesse dia.
      </p>
    </>
  );
}
