"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { criarConteudo } from "@/app/actions";
import { PreviaGoogle } from "./PreviaGoogle";
import type { Resultado } from "@/lib/acoes-tipos";
import type { Cliente, Midia, TipoConteudo } from "@/lib/tipos";

export function FormNovoConteudo({
  clientes,
  midias,
  clienteInicial,
  guias,
}: {
  clientes: Cliente[];
  midias: Midia[];
  clienteInicial?: string;
  // Exemplos de tom de cada cliente, usados como ponto de partida do texto
  guias: Record<string, { resposta: string; postagem: string }>;
}) {
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(criarConteudo, null);
  const [tipo, setTipo] = useState<TipoConteudo>("postagem");
  const [clienteId, setClienteId] = useState(clientes.find((c) => c.slug === clienteInicial)?.id ?? clientes[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [avaliador, setAvaliador] = useState("");
  const [estrelas, setEstrelas] = useState(5);
  const [avaliacao, setAvaliacao] = useState("");
  const [midiaId, setMidiaId] = useState("");
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) {
      form.current?.reset();
      setTexto("");
      setAvaliador("");
      setAvaliacao("");
      setMidiaId("");
    }
  }, [estado]);

  const cliente = clientes.find((c) => c.id === clienteId);
  const fotos = midias.filter((m) => m.cliente_id === clienteId && m.categoria !== "COVER");
  const foto = fotos.find((m) => m.id === midiaId);
  const guia = guias[clienteId];
  const limite = tipo === "postagem" ? 1500 : 4000;

  return (
    <div className="diretrizes-grade">
      <form ref={form} action={acao} className="form-grade form-largo" aria-busy={pendente}>
        <fieldset disabled={pendente}>
          <label htmlFor="nc-cliente">Cliente</label>
          <select
            id="nc-cliente"
            name="cliente_id"
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value);
              setMidiaId("");
            }}
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <label htmlFor="nc-tipo">O que escrever</label>
          <select id="nc-tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoConteudo)}>
            <option value="postagem">Postagem no perfil</option>
            <option value="resposta">Resposta a uma avaliação</option>
          </select>

          {tipo === "resposta" && (
            <>
              <div className="linha-dupla">
                <div>
                  <label htmlFor="nc-avaliador">Nome de quem avaliou</label>
                  <input id="nc-avaliador" name="avaliador" maxLength={120} value={avaliador} onChange={(e) => setAvaliador(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="nc-estrelas">Estrelas</label>
                  <select id="nc-estrelas" name="estrelas" value={estrelas} onChange={(e) => setEstrelas(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "estrela" : "estrelas"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label htmlFor="nc-avaliacao">Texto da avaliação</label>
              <textarea id="nc-avaliacao" name="avaliacao" rows={3} maxLength={2000} value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} />
            </>
          )}

          <label htmlFor="nc-texto">{tipo === "postagem" ? "Texto da postagem" : "Texto da resposta"}</label>
          <textarea id="nc-texto" name="texto" rows={6} required maxLength={limite} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <p className={`contador${texto.length > limite * 0.9 ? " contador-alerta" : ""}`}>
            {texto.length}/{limite}
          </p>
          {guia && (tipo === "postagem" ? guia.postagem : guia.resposta) && !texto && (
            <p>
              <button
                type="button"
                className="btn btn-discreto"
                onClick={() => setTexto((tipo === "postagem" ? guia.postagem : guia.resposta).replaceAll("{nome}", avaliador || "{nome}"))}
              >
                Começar pelo exemplo do tom deste cliente
              </button>
            </p>
          )}

          {tipo === "postagem" && (
            <>
              <label htmlFor="nc-midia">Imagem da postagem</label>
              <select id="nc-midia" name="midia_id" value={midiaId} onChange={(e) => setMidiaId(e.target.value)}>
                <option value="">Sem imagem</option>
                {fotos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome_original ?? "Imagem"} ({m.status === "na_fila" ? "na fila" : "já enviada"})
                  </option>
                ))}
              </select>
              {fotos.length === 0 && <p className="dica">Este cliente ainda não tem imagens. Envie na aba Imagens do cliente.</p>}
            </>
          )}
        </fieldset>

        {estado?.erro && (
          <p role="alert" className="erro">
            {estado.erro}
          </p>
        )}
        {estado?.ok && (
          <p role="status" className="sucesso">
            Salvo. Veja na lista abaixo.
          </p>
        )}
        <div className="acoes-botoes">
          <button type="submit" name="acao" value="aprovado" className="btn btn-primario" disabled={pendente}>
            Aprovar para a próxima rodada
          </button>
          <button type="submit" name="acao" value="rascunho" className="btn" disabled={pendente}>
            Guardar como rascunho
          </button>
        </div>
      </form>

      <aside className="diretrizes-previas" aria-label="Prévia">
        <PreviaGoogle
          tipo={tipo}
          cliente={cliente?.nome ?? "Cliente"}
          categoria={cliente?.categoria}
          texto={texto}
          imagemUrl={foto?.url}
          avaliador={avaliador}
          estrelas={estrelas}
          avaliacao={avaliacao}
        />
      </aside>
    </div>
  );
}
