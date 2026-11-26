import { numeroBR } from "@/lib/desempenho";

const CORES = ["var(--azul)", "var(--preto)", "var(--azul-vivo)", "var(--linha-forte)"];
const RAIO = 44;
const ESPESSURA = 18;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
const FOLGA = 2; // o respiro entre fatias, na cor do fundo

// Rosca para poucas fatias (até 4) que somam um todo. O nome, o número e a porcentagem de cada fatia estão na legenda ao lado:
// a cor só ajuda a ligar a legenda ao desenho.
export function Rosca({ fatias, rotulo, unidade }: { fatias: { nome: string; n: number }[]; rotulo: string; unidade: string }) {
  const total = fatias.reduce((s, f) => s + f.n, 0);
  const partes = fatias.map((f) => ({ ...f, pct: total > 0 ? (f.n / total) * 100 : 0 }));
  let acumulado = 0;
  const resumo = partes.map((f) => `${f.nome}: ${numeroBR(f.n)} (${Math.round(f.pct)}%)`).join("; ");
  return (
    <div className="rosca">
      <svg className="rosca-desenho" viewBox="0 0 120 120" role="img" aria-label={`${rotulo}. ${resumo}`}>
        <circle cx="60" cy="60" r={RAIO} fill="none" stroke="var(--suave)" strokeWidth={ESPESSURA} />
        {total > 0 &&
          partes.map((f, i) => {
            if (f.n <= 0) return null;
            const inteiro = (f.n / total) * CIRCUNFERENCIA;
            const comprimento = partes.filter((x) => x.n > 0).length > 1 ? Math.max(inteiro - FOLGA, 0.5) : inteiro;
            const inicio = acumulado;
            acumulado += inteiro;
            return (
              <circle
                key={f.nome}
                cx="60"
                cy="60"
                r={RAIO}
                fill="none"
                stroke={CORES[i % CORES.length]}
                strokeWidth={ESPESSURA}
                strokeDasharray={`${comprimento} ${CIRCUNFERENCIA - comprimento}`}
                strokeDashoffset={-inicio}
                transform="rotate(-90 60 60)"
              />
            );
          })}
        <text x="60" y="58" textAnchor="middle" className="rosca-total">
          {numeroBR(total)}
        </text>
        <text x="60" y="73" textAnchor="middle" className="rosca-unidade">
          {unidade}
        </text>
      </svg>
      <ul className="rosca-legenda">
        {partes.map((f, i) => (
          <li key={f.nome}>
            <span className="rosca-chave" style={{ background: CORES[i % CORES.length] }} aria-hidden="true" />
            <span className="rosca-nome">{f.nome}</span>
            <span className="rosca-numero">
              <strong>{numeroBR(f.n)}</strong> · {Math.round(f.pct)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
