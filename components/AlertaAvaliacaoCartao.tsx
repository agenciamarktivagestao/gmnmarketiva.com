"use client";

import { useId, useState, useTransition } from "react";
import { reabrirAlertaAvaliacao, tratarAlertaAvaliacao } from "@/app/actions";
import { Estrelas } from "@/components/Estrelas";
import { LIMITE_DESFECHO, motivoRotulo } from "@/lib/avaliacoes-ruins";
import type { AlertaAvaliacao } from "@/lib/avaliacoes-ruins";
import { dataCurta } from "@/lib/rotulos";

const TEXTO_CURTO = 320;
// Atalhos para o campo "Como foi tratada?": só preenchem o texto, que ainda pode ser editado
const SUGESTOES = ["Respondida pelo dono", "Denunciada ao Google", "Deixada como está"];

// Uma avaliação ruim: o que ela diz, por que a rotina avisou e o botão de marcar como tratada
export function AlertaAvaliacaoCartao({ a, podeEditar }: { a: AlertaAvaliacao; podeEditar: boolean }) {
  const id = useId();
  const [lerTudo, setLerTudo] = useState(false);
  const [desfecho, setDesfecho] = useState("");
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const texto = a.texto?.trim() ?? "";
  const longo = texto.length > TEXTO_CURTO;
  const tratada = a.situacao === "tratada";

  const tratar = () =>
    iniciar(async () => {
      setErro(null);
      const r = await tratarAlertaAvaliacao(a.id, desfecho);
      if (r.erro) setErro(r.erro);
    });
  const reabrir = () =>
    iniciar(async () => {
      setErro(null);
      const r = await reabrirAlertaAvaliacao(a.id);
      if (r.erro) setErro(r.erro);
    });

  return (
    <article className={`avaliacao alerta-avaliacao${tratada ? " alerta-tratada" : ""}`} aria-busy={pendente}>
      <header className="avaliacao-topo">
        <strong>{a.avaliador}</strong>
        <Estrelas n={a.estrelas} />
        <span className="alerta-motivo">{motivoRotulo(a.motivo)}</span>
        <span className="avaliacao-data" suppressHydrationWarning>
          {a.avaliada_em ? `avaliada em ${dataCurta(`${a.avaliada_em}T12:00:00Z`)}` : `avisada em ${dataCurta(a.detectada_em)}`}
        </span>
      </header>

      {texto ? (
        <blockquote className="avaliacao-texto">
          {longo && !lerTudo ? `${texto.slice(0, TEXTO_CURTO).trimEnd()}…` : texto}
          {longo && (
            <button type="button" className="btn btn-discreto" aria-expanded={lerTudo} onClick={() => setLerTudo(!lerTudo)}>
              {lerTudo ? "Mostrar menos" : "Ler tudo"}
            </button>
          )}
        </blockquote>
      ) : (
        <p className="avaliacao-texto avaliacao-sem-texto">Só a nota, sem comentário.</p>
      )}

      {a.motivo_detalhe && (
        <p className="alerta-porque">
          <strong>Por que a rotina avisou:</strong> {a.motivo_detalhe}
        </p>
      )}

      {tratada ? (
        <div className="avaliacao-feita" role="status">
          <p>
            Tratada{a.tratada_em ? ` em ${dataCurta(a.tratada_em)}` : ""}
            {a.tratada_por ? ` por ${a.tratada_por.split("@")[0]}` : ""}.
          </p>
          {a.desfecho && <p>{a.desfecho}</p>}
          {podeEditar && (
            <button type="button" className="btn btn-discreto" onClick={reabrir} disabled={pendente}>
              Reabrir
            </button>
          )}
        </div>
      ) : (
        podeEditar && (
          <div className="avaliacao-resposta">
            <label htmlFor={`${id}-d`}>Como foi tratada?</label>
            <input
              id={`${id}-d`}
              type="text"
              value={desfecho}
              maxLength={LIMITE_DESFECHO}
              onChange={(e) => setDesfecho(e.target.value)}
              placeholder="Por exemplo: denunciada ao Google"
              autoComplete="off"
            />
            <div className="alerta-sugestoes" role="group" aria-label="Atalhos para o texto">
              {SUGESTOES.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => setDesfecho(s)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="avaliacao-botoes">
              <button type="button" className="btn btn-primario" disabled={pendente || !desfecho.trim()} onClick={tratar}>
                Marcar como tratada
              </button>
            </div>
          </div>
        )
      )}
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
    </article>
  );
}
