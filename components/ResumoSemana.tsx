import { quandoFoi } from "@/lib/semana";
import type { Semana } from "@/lib/semana";

// Os quatro números da semana e quando a rotina agiu pela última vez
export function ResumoSemana({ semana, rotulo }: { semana: Semana; rotulo: string }) {
  const itens = [
    { n: semana.total, nome: semana.total === 1 ? "ação registrada" : "ações registradas" },
    { n: semana.daRotina, nome: semana.daRotina === 1 ? "feita pela rotina" : "feitas pela rotina" },
    { n: semana.daEquipe, nome: semana.daEquipe === 1 ? "feita pela equipe" : "feitas pela equipe" },
    { n: semana.falhas, nome: semana.falhas === 1 ? "falhou" : "falharam", alerta: semana.falhas > 0 },
  ];
  return (
    <>
      <dl className="semana-resumo" aria-label={rotulo}>
        {itens.map((i) => (
          <div key={i.nome} className={i.alerta ? "semana-resumo-alerta" : undefined}>
            <dt>{i.nome}</dt>
            <dd>{i.n}</dd>
          </div>
        ))}
      </dl>
      <p className="semana-ultima">
        {semana.ultimaRotina
          ? `A rotina agiu pela última vez ${quandoFoi(semana.ultimaRotina, semana.dias)}.`
          : "A rotina ainda não registrou ações nesta semana."}
      </p>
    </>
  );
}
