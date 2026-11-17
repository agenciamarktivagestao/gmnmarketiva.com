"use client";

import { useState, useTransition } from "react";
import { comentar, decidir } from "@/app/actions";
import { dataCurta, hora } from "@/lib/rotulos";
import type { Comentario, Status } from "@/lib/tipos";

export function AcoesPendencia({
  id,
  status,
  comentarios,
  podeEditar,
}: {
  id: string;
  status: Status;
  comentarios: Comentario[];
  podeEditar: boolean;
}) {
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
      {podeEditar && (
        <div className="acoes-botoes">
          {status === "aberta" && (
            <>
              <button type="button" className="btn btn-primario" disabled={pendente} onClick={() => mudar("aprovada")}>
                Aprovar
              </button>
              <button type="button" className="btn" disabled={pendente} onClick={() => mudar("recusada")}>
                Recusar
              </button>
            </>
          )}
          {(status === "aberta" || status === "aprovada") && (
            <button type="button" className="btn" disabled={pendente} onClick={() => mudar("concluida")}>
              Marcar como feito
            </button>
          )}
          {(status === "aprovada" || status === "recusada" || status === "concluida") && (
            <button type="button" className="btn btn-discreto" disabled={pendente} onClick={() => mudar("aberta")}>
              Reabrir
            </button>
          )}
        </div>
      )}
      <button type="button" className="btn btn-discreto" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        {comentarios.length > 0 ? `Comentários (${comentarios.length})` : "Comentar"}
      </button>

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
