"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { responderAvaliacao } from "@/app/actions";
import { Estrelas } from "@/components/Estrelas";
import { dataCurta } from "@/lib/rotulos";
import type { Avaliacao, Pendencia, PayloadApprove } from "@/lib/tipos";

type Andamento = Record<string, { acao: "publicar" | "revisao"; conteudo_id?: string }>;

const LIMITE = 4096; // tamanho máximo de uma resposta no Google
const TEXTO_CURTO = 320;

function diasSemResposta(iso: string) {
  const dias = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));
  return dias === 0 ? "sem resposta desde hoje" : dias === 1 ? "sem resposta há 1 dia" : `sem resposta há ${dias} dias`;
}

function CartaoAvaliacao({ p, av, andamento, podeEditar }: { p: Pendencia; av: Avaliacao; andamento: Andamento[string] | undefined; podeEditar: boolean }) {
  const id = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  const [resposta, setResposta] = useState(av.resposta_sugerida);
  const [lerTudo, setLerTudo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const texto = av.texto?.trim() ?? "";
  const longo = texto.length > TEXTO_CURTO;
  const excesso = resposta.length > LIMITE;
  const editada = resposta.trim() !== av.resposta_sugerida.trim();

  // A caixa cresce com o texto, em qualquer largura de tela
  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [resposta, andamento]);

  const enviar = (acao: "publicar" | "revisao") =>
    iniciar(async () => {
      setErro(null);
      const r = await responderAvaliacao(p.id, av.review_id, acao, resposta);
      if (r.erro) setErro(r.erro);
    });

  return (
    <article className="avaliacao" aria-busy={pendente}>
      <header className="avaliacao-topo">
        <strong>{av.avaliador}</strong>
        <Estrelas n={av.estrelas} />
        <span className="avaliacao-data" suppressHydrationWarning>
          {dataCurta(av.data)}, {diasSemResposta(av.data)}
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

      {andamento ? (
        <p className="avaliacao-feita" role="status">
          {andamento.acao === "publicar"
            ? "Resposta aprovada. A rotina publica na próxima rodada."
            : "Revisão pedida ao Google. A rotina não faz esta parte: peça pelo perfil, no Chrome."}
        </p>
      ) : (
        podeEditar && (
          <div className="avaliacao-resposta">
            <label htmlFor={`${id}-r`}>
              Resposta sugerida, no tom do cliente{editada ? " (editada)" : ""}
            </label>
            <textarea id={`${id}-r`} ref={campo} rows={4} value={resposta} onChange={(e) => setResposta(e.target.value)} aria-describedby={`${id}-n`} />
            <p id={`${id}-n`} className={excesso ? "contador contador-alerta" : "contador"}>
              {resposta.length} de {LIMITE} caracteres
            </p>
            <div className="avaliacao-botoes">
              <button type="button" className="btn btn-primario" disabled={pendente || !resposta.trim() || excesso} onClick={() => enviar("publicar")}>
                Publicar resposta
              </button>
              <button type="button" className="btn" disabled={pendente} onClick={() => enviar("revisao")}>
                Pedir revisão ao Google
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

// As avaliações da pendência, da mais antiga para a mais recente
export function Avaliacoes({ p, payload, podeEditar }: { p: Pendencia; payload: PayloadApprove; podeEditar: boolean }) {
  const andamento = ((p.resposta as { valor?: Andamento } | null)?.valor ?? {}) as Andamento;
  const lista = [...(payload.avaliacoes ?? [])].sort((a, b) => a.data.localeCompare(b.data));
  const feitas = lista.filter((a) => andamento[a.review_id]).length;
  return (
    <div className="avaliacoes">
      {payload.aviso && <p className="aviso">{payload.aviso}</p>}
      <p className="avaliacoes-progresso">
        {feitas} de {lista.length} {lista.length === 1 ? "avaliação tratada" : "avaliações tratadas"}
      </p>
      {lista.map((av) => (
        <CartaoAvaliacao key={av.review_id} p={p} av={av} andamento={andamento[av.review_id]} podeEditar={podeEditar} />
      ))}
    </div>
  );
}
