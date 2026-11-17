"use client";

import { useState, useTransition } from "react";
import { apagarConteudo, decidirConteudo, editarConteudo } from "@/app/actions";
import { PreviaGoogle } from "./PreviaGoogle";
import { dataCurta } from "@/lib/rotulos";
import type { Resultado } from "@/lib/acoes-tipos";
import type { Cliente, Conteudo } from "@/lib/tipos";

const ROTULO: Record<Conteudo["status"], string> = {
  rascunho: "Espera a sua decisão",
  aprovado: "Aprovado, sai na próxima rodada",
  publicado: "Publicado",
  recusado: "Recusado",
};
const CLASSE: Record<Conteudo["status"], string> = {
  rascunho: "etiqueta-media",
  aprovado: "etiqueta-aprovada",
  publicado: "etiqueta-concluida",
  recusado: "etiqueta-recusada",
};

export function ItemConteudo({
  c,
  cliente,
  imagemUrl,
  podeEditar,
}: {
  c: Conteudo;
  cliente: Cliente;
  imagemUrl?: string | null;
  podeEditar: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(c.texto);

  const rodar = (fn: () => Promise<Resultado>, depois?: () => void) =>
    iniciar(async () => {
      setErro(null);
      const r = await fn();
      if (r.erro) setErro(r.erro);
      else depois?.();
    });

  const travado = c.status === "publicado";
  const limite = c.tipo === "postagem" ? 1500 : 4000;

  return (
    <li className="conteudo" aria-busy={pendente}>
      <div className="conteudo-previa">
        <PreviaGoogle
          tipo={c.tipo}
          cliente={cliente.nome}
          categoria={cliente.categoria}
          texto={editando ? texto : c.texto}
          imagemUrl={imagemUrl}
          avaliador={c.avaliador}
          estrelas={c.estrelas}
          avaliacao={c.avaliacao}
        />
      </div>
      <div className="conteudo-lado">
        <p className="pend-meta">
          <span className={`etiqueta ${CLASSE[c.status]}`}>{ROTULO[c.status]}</span>
          <span className="etiqueta">{c.origem === "rotina" ? "Escrito pela rotina" : "Escrito pela equipe"}</span>
        </p>
        <p className="pend-meta">
          {c.status === "publicado" && c.publicado_em
            ? `Publicado em ${dataCurta(c.publicado_em)}`
            : c.decidido_por && c.decidido_em
              ? `${c.status === "recusado" ? "Recusado" : "Aprovado"} por ${c.decidido_por.split("@")[0]} em ${dataCurta(c.decidido_em)}`
              : `Criado em ${dataCurta(c.criado_em)}`}
        </p>

        {editando && (
          <div className="servico-edicao">
            <label className="sr-only" htmlFor={`ct-${c.id}`}>
              Texto
            </label>
            <textarea id={`ct-${c.id}`} rows={6} value={texto} maxLength={limite} onChange={(e) => setTexto(e.target.value)} />
            <p className="contador">
              {texto.length}/{limite}. Se o texto já estava aprovado, volta a pedir decisão.
            </p>
            <div className="acoes-botoes">
              <button
                type="button"
                className="btn btn-primario"
                disabled={pendente}
                onClick={() => rodar(() => editarConteudo(c.id, texto), () => setEditando(false))}
              >
                Salvar texto
              </button>
              <button
                type="button"
                className="btn btn-discreto"
                onClick={() => {
                  setTexto(c.texto);
                  setEditando(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {podeEditar && !travado && !editando && (
          <div className="acoes-botoes">
            {c.status === "rascunho" && (
              <>
                <button type="button" className="btn btn-primario" disabled={pendente} onClick={() => rodar(() => decidirConteudo(c.id, "aprovado"))}>
                  Aprovar
                </button>
                <button type="button" className="btn" disabled={pendente} onClick={() => rodar(() => decidirConteudo(c.id, "recusado"))}>
                  Recusar
                </button>
              </>
            )}
            {(c.status === "aprovado" || c.status === "recusado") && (
              <button type="button" className="btn btn-discreto" disabled={pendente} onClick={() => rodar(() => decidirConteudo(c.id, "rascunho"))}>
                Voltar para rascunho
              </button>
            )}
            <button type="button" className="btn btn-discreto" onClick={() => setEditando(true)}>
              Editar texto
            </button>
            <button type="button" className="btn btn-discreto" disabled={pendente} onClick={() => rodar(() => apagarConteudo(c.id))}>
              Apagar
            </button>
          </div>
        )}
        {erro && (
          <p role="alert" className="erro">
            {erro}
          </p>
        )}
      </div>
    </li>
  );
}
