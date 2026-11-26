import { MapaDaGrade } from "@/components/MapaDaGrade";
import { MudancaNoRanking } from "@/components/MudancaNoRanking";
import { Tendencia } from "@/components/Tendencia";
import { diaCompleto, diaCurto } from "@/lib/desempenho";
import { medicaoConfiavel } from "@/lib/ranking";
import type { PalavraMedida } from "@/lib/ranking";

const percentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const posicaoMedia = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const distancia = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

// Uma palavra de busca: o mapa da última medição, os três números que o resumem e o que mudou desde a medição anterior
export function RankingDaPalavra({ p, nomeDoCliente }: { p: PalavraMedida; nomeDoCliente: string }) {
  const { atual, resumo } = p;
  const lidoPouco = !medicaoConfiavel(resumo);
  const solvs = p.historico.map((h) => h.solv);
  return (
    <article className="ranking-palavra" aria-label={`Posição de ${nomeDoCliente} para a busca ${p.palavra}`}>
      <header>
        <h3>{p.palavra}</h3>
        <p className="ranking-meta">
          Medido em {diaCompleto(atual.dia)} · grade de {atual.grade}×{atual.grade} pontos, a {distancia.format(atual.espacamento_km)} km um do outro
        </p>
      </header>
      <div className="ranking-corpo">
        <MapaDaGrade posicoes={atual.posicoes} grade={atual.grade} rotulo={`Posição de ${nomeDoCliente} para a busca ${p.palavra}, medida em ${diaCompleto(atual.dia)}`} />
        <div className="ranking-lado">
          <dl className="ranking-numeros">
            <div>
              <dt>No top 3</dt>
              <dd>
                <strong>{resumo.solv === null ? "–" : `${percentual.format(resumo.solv)}%`}</strong> <small>dos pontos</small>
              </dd>
            </div>
            <div>
              <dt>Entre os 20 primeiros</dt>
              <dd>
                <strong>{resumo.apareceEmPct === null ? "–" : `${percentual.format(resumo.apareceEmPct)}%`}</strong> <small>dos pontos</small>
              </dd>
            </div>
            <div>
              <dt>Posição média onde aparece</dt>
              <dd>
                <strong>{resumo.arp === null ? "–" : posicaoMedia.format(resumo.arp)}</strong> <small>quanto menor, melhor</small>
              </dd>
            </div>
          </dl>
          <p className="ranking-mudanca">
            <MudancaNoRanking mudanca={p.mudanca} />
          </p>
          {lidoPouco && (
            <p className="ranking-aviso">
              Só {resumo.lidos} de {resumo.pontos} pontos foram lidos nesta medição, então o resultado pode não mostrar a região inteira.
            </p>
          )}
          {p.historico.length > 1 && (
            <div className="ranking-historico">
              <Tendencia valores={solvs} rotulo={`Presença no top 3 para a busca ${p.palavra}, em cada medição`} largura={150} altura={40} preencher />
              <ul aria-label="Presença no top 3 em cada medição">
                {p.historico.map((h) => (
                  <li key={h.dia}>
                    <span>{diaCurto(h.dia)}</span> <strong>{h.solv === null ? "–" : `${percentual.format(h.solv)}%`}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
