"use client";

import { useState, useTransition } from "react";
import { comentar, decidir } from "@/app/actions";
import { Decisao } from "./Decisao";
import { dataCurta, hora } from "@/lib/rotulos";
import type { Pendencia, Status } from "@/lib/tipos";

// Parte principal (conforme o tipo da pendência) e, abaixo, as ações secundárias: Recusar,
// Marcar como feito e Comentar. As decisões continuam gravadas como sempre: status e comentário.
export function AcoesPendencia({ p, podeEditar }: { p: Pendencia; podeEditar: boolean }) {
  const { id, status, comentarios } = p;
  const kind = p.kind ?? "approve";
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");

  const mudar = (novo: Status) =>
    iniciar(async () => {
      setErro(null);
      const r = await decidir(id, novo);
      if (r.erro) setErro(r.erro);
    });

  const enviar = () =>
    iniciar(async () => {
      setErro(null);
      const r = await comentar(id, texto);
      if (r.erro) setErro(r.erro);
      else setTexto("");
    });

  return (
    <div className="acoes" aria-busy={pendente}>
      <Decisao p={p} podeEditar={podeEditar} mudar={mudar} pendente={pendente} />

      <div className="acoes-sec">
        {podeEditar && status === "aberta" && (
          <button type="button" className="btn btn-discreto" disabled={pendente} onClick={() => mudar("recusada")}>
            Recusar
          </button>
        )}
        {podeEditar && (status === "aberta" || status === "aprovada") && (
          // Em pendências que só se resolvem fora do painel, "Marcar como feito" é o caminho principal
          <button type="button" className={kind === "external" && status === "aberta" ? "btn" : "btn btn-discreto"} disabled={pendente} onClick={() => mudar("concluida")}>
            Marcar como feito
          </button>
        )}
        {podeEditar && (status === "aprovada" || status === "recusada" || status === "concluida") && (
          <button type="button" className="btn btn-discreto" disabled={pendente} onClick={() => mudar("aberta")}>
            Reabrir
          </button>
        )}
        <button type="button" className="btn btn-discreto" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
          {comentarios.length > 0 ? `Comentários (${comentarios.length})` : "Comentar"}
        </button>
      </div>

      {aberto && (
        <div className="comentarios">
          {comentarios.length > 0 && (
            <ul>
              {comentarios.map((c) => (
                <li key={c.id}>
                  <p className="comentario-autor">
                    {c.autor.split("@")[0]}, {dataCurta(c.criado_em)} {hora(c.criado_em)}
                  </p>
                  <p>{c.texto}</p>
                </li>
              ))}
            </ul>
          )}
          {podeEditar && (
            <>
              <label className="sr-only" htmlFor={`c-${id}`}>
                Novo comentário
              </label>
              <textarea
                id={`c-${id}`}
                rows={3}
                value={texto}
                maxLength={2000}
                placeholder="Diga o que fazer ou o que mudou. A rotina lê isto na próxima rodada."
                onChange={(e) => setTexto(e.target.value)}
              />
              <button type="button" className="btn btn-primario" disabled={pendente || !texto.trim()} onClick={enviar}>
                Enviar comentário
              </button>
            </>
          )}
        </div>
      )}
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
    </div>
  );
}
