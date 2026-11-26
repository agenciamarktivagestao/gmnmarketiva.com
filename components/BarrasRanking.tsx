import { numeroBR } from "@/lib/desempenho";

// Barras horizontais, do maior para o menor. O número fica na ponta de cada barra, então nada depende de passar o mouse.
// Uma cor só: aqui a posição e o comprimento já dizem tudo.
export function BarrasRanking({ itens, unidade, rotulo }: { itens: { nome: string; n: number }[]; unidade: string; rotulo: string }) {
  const max = Math.max(...itens.map((i) => i.n), 1);
  return (
    <ul className="ranking" aria-label={rotulo}>
      {itens.map((i) => (
        <li key={i.nome}>
          <span className="ranking-nome">{i.nome}</span>
          <span className="ranking-trilho" aria-hidden="true">
            <span className="ranking-barra" style={{ width: `${Math.max((i.n / max) * 100, i.n > 0 ? 1.5 : 0)}%` }} />
          </span>
          <span className="ranking-valor">
            <strong>{numeroBR(i.n)}</strong>
            <span className="sr-only"> {unidade}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
