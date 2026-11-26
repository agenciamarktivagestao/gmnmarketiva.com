import type { ReactNode } from "react";

// O quadro de cada bloco do painel. `colunas` diz quantas das 12 colunas ele ocupa em tela grande; no celular todos ocupam a linha inteira.
export function CartaoDoPainel({ id, titulo, dica, colunas = 12, children }: { id: string; titulo: string; dica?: ReactNode; colunas?: 4 | 5 | 6 | 7 | 8 | 12; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`dash-cartao dash-c${colunas}`}>
      <h2 id={id}>{titulo}</h2>
      {dica && <p className="dash-dica">{dica}</p>}
      {children}
    </section>
  );
}
