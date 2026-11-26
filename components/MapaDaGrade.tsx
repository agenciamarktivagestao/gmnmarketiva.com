import type { CSSProperties } from "react";
import { bandaDaPosicao, textoDaPosicao } from "@/lib/ranking";
import type { Banda, Posicao } from "@/lib/ranking";

const LEGENDA: { banda: Banda; texto: string }[] = [
  { banda: "top3", texto: "1 a 3" },
  { banda: "top10", texto: "4 a 10" },
  { banda: "top20", texto: "11 a 20" },
  { banda: "fora", texto: "20+ (fora)" },
  { banda: "sem", texto: "sem leitura" },
];

const porExtenso = (p: Posicao) => (p === null ? "sem leitura" : p > 20 ? "fora das 20 primeiras" : `posição ${p}`);

// A região vista de cima: cada quadrado é um ponto de onde a busca foi feita e o número é a posição do perfil ali.
// A primeira linha é o norte. O número está em todo quadrado, então a cor nunca é a única informação.
export function MapaDaGrade({ posicoes, grade, rotulo }: { posicoes: Posicao[]; grade: number; rotulo: string }) {
  const linhas = Array.from({ length: grade }, (_, l) => posicoes.slice(l * grade, (l + 1) * grade));
  return (
    <figure className="grade-figura" style={{ "--n": grade } as CSSProperties}>
      <p className="grade-norte" aria-hidden="true">
        Norte ▲
      </p>
      <table className="grade">
        <caption className="sr-only">{rotulo}. Cada quadrado é um ponto de busca e o número é a posição do perfil nele. A primeira linha é o norte.</caption>
        <tbody>
          {linhas.map((linha, l) => (
            <tr key={l}>
              {linha.map((p, c) => (
                <td key={c} className={`grade-${bandaDaPosicao(p)}`}>
                  <span className="sr-only">
                    linha {l + 1}, coluna {c + 1}: {porExtenso(p)}.
                  </span>
                  <span aria-hidden="true">{textoDaPosicao(p)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="grade-legenda" aria-hidden="true">
        {LEGENDA.map((i) => (
          <li key={i.banda}>
            <span className={`grade-chave grade-${i.banda}`} /> {i.texto}
          </li>
        ))}
      </ul>
    </figure>
  );
}
