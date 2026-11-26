import Link from "next/link";
import { Variacao } from "@/components/Variacao";
import type { Variacao as VariacaoDados } from "@/lib/desempenho";

export type ItemDeVariacao = { nome: string; href: string; v: VariacaoDados };

// Quem mais subiu ou quem mais caiu. O comprimento da barra é a diferença em número de aparições; a seta, a palavra e o número dizem o mesmo.
export function BarrasVariacao({ itens, rotulo, contra, tom }: { itens: ItemDeVariacao[]; rotulo: string; contra: string; tom: "subiu" | "caiu" }) {
  const max = Math.max(...itens.map((i) => Math.abs(i.v.delta)), 1);
  return (
    <ul className={`variacao-lista variacao-lista-${tom}`} aria-label={rotulo}>
      {itens.map((i) => (
        <li key={i.href}>
          <Link href={i.href} className="variacao-lista-nome">
            {i.nome}
          </Link>
          <span className="variacao-lista-trilho" aria-hidden="true">
            <span className="variacao-lista-barra" style={{ width: `${Math.max((Math.abs(i.v.delta) / max) * 100, 2)}%` }} />
          </span>
          <Variacao v={i.v} contra={contra} />
        </li>
      ))}
    </ul>
  );
}
