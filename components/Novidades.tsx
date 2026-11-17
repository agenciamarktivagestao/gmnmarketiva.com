"use client";

import { useEffect, useState } from "react";
import { marcarNovidadesVistas } from "@/app/actions";
import { TIPO_MUDANCA, contarNovas, ehNova, linkDoCommit } from "@/lib/mudancas";
import { dataLonga, hora } from "@/lib/rotulos";
import type { Mudanca } from "@/lib/tipos";

export function Novidades({ mudancas, vistoAte }: { mudancas: Mudanca[]; vistoAte: string | null }) {
  // O que era novo ao abrir continua marcado enquanto a página está aberta, mesmo depois de marcar como visto
  const [antes] = useState(vistoAte);
  const novas = contarNovas(mudancas, antes);

  useEffect(() => {
    if (novas > 0) void marcarNovidadesVistas();
  }, [novas]);

  if (mudancas.length === 0) {
    return <p className="vazio">Nada registrado ainda. Cada ajuste feito no sistema aparece aqui.</p>;
  }

  const dias = new Map<string, Mudanca[]>();
  mudancas.forEach((m) => {
    const chave = dataLonga(m.feito_em);
    dias.set(chave, [...(dias.get(chave) ?? []), m]);
  });

  return (
    <>
      <p className="contagem" aria-live="polite">
        {novas > 0 ? `${novas === 1 ? "1 novidade desde a sua última visita" : `${novas} novidades desde a sua última visita`}.` : "Você está em dia."}
      </p>
      {[...dias.entries()].map(([dia, lista]) => (
        <section key={dia} className="dia">
          <h2>{dia}</h2>
          <ul className="novidades">
            {lista.map((m) => {
              const nova = ehNova(m.feito_em, antes);
              const commit = linkDoCommit(m.commit_sha);
              return (
                <li key={m.id} className={nova ? "novidade novidade-nova" : "novidade"}>
                  <details open={nova}>
                    <summary>
                      <span className="novidade-meta">
                        <span className="etiqueta">{TIPO_MUDANCA[m.tipo]}</span>
                        {nova && <span className="etiqueta etiqueta-nova">Nova</span>}
                        <span className="novidade-hora">{hora(m.feito_em)}</span>
                      </span>
                      <h3>{m.titulo}</h3>
                      <p className="novidade-resumo">{m.resumo}</p>
                    </summary>
                    <div className="novidade-corpo">
                      {m.itens.length > 0 && (
                        <ul className="novidade-itens">
                          {m.itens.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {m.como_testar && (
                        <p>
                          <strong>Como conferir:</strong> {m.como_testar}
                        </p>
                      )}
                      {m.pendente && (
                        <p>
                          <strong>O que falta:</strong> {m.pendente}
                        </p>
                      )}
                      <p className="novidade-rodape">
                        Feito por {m.autor}
                        {commit && (
                          <>
                            {" · "}
                            <a href={commit} target="_blank" rel="noreferrer">
                              Ver o código ({m.commit_sha})<span className="sr-only"> (abre em nova aba)</span>
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
