"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { apagarServico, criarServico, decidirServico, editarServico } from "@/app/actions";
import type { Resultado } from "@/lib/acoes-tipos";
import type { Cliente, Servico } from "@/lib/tipos";

function LinhaServico({ s, podeEditar }: { s: Servico; podeEditar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(s.nome);
  const [descricao, setDescricao] = useState(s.descricao);
  const [erro, setErro] = useState<string | null>(null);

  const rodar = (fn: () => Promise<Resultado>, depois?: () => void) =>
    iniciar(async () => {
      setErro(null);
      const r = await fn();
      if (r.erro) setErro(r.erro);
      else depois?.();
    });

  const ehAlteracao = s.status === "aprovado" && s.origem === "perfil";

  return (
    <li className="servico" aria-busy={pendente}>
      {editando ? (
        <div className="servico-edicao">
          <label className="sr-only" htmlFor={`sn-${s.id}`}>
            Nome do serviço
          </label>
          <input id={`sn-${s.id}`} value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
          <label className="sr-only" htmlFor={`sd-${s.id}`}>
            Descrição do serviço
          </label>
          <textarea id={`sd-${s.id}`} rows={3} value={descricao} maxLength={300} onChange={(e) => setDescricao(e.target.value)} />
          <p className={`contador${descricao.length > 150 ? " contador-alerta" : ""}`}>{descricao.length}/150 recomendados, até 300</p>
          <div className="acoes-botoes">
            <button
              type="button"
              className="btn btn-primario"
              disabled={pendente}
              onClick={() => rodar(() => editarServico(s.id, nome, descricao), () => setEditando(false))}
            >
              Salvar
            </button>
            <button type="button" className="btn btn-discreto" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="servico-corpo">
            <h3>{s.nome}</h3>
            {s.descricao ? <p className="servico-desc">{s.descricao}</p> : <p className="servico-desc vazio-inline">Sem descrição</p>}
            <p className="pend-meta">
              {ehAlteracao && <span className="etiqueta etiqueta-aprovada">Alteração aprovada</span>}
              {s.status === "aprovado" && !ehAlteracao && <span className="etiqueta etiqueta-aprovada">Novo, aprovado</span>}
              {s.status === "sugerido" && <span className="etiqueta etiqueta-media">Sugerido pela {s.origem === "rotina" ? "rotina" : "equipe"}</span>}
              {s.status === "recusado" && <span className="etiqueta etiqueta-recusada">Recusado</span>}
              {s.decidido_por && s.status !== "no_perfil" && <span className="etiqueta">por {s.decidido_por.split("@")[0]}</span>}
            </p>
          </div>
          {podeEditar && (
            <div className="acoes-botoes">
              {s.status === "sugerido" && (
                <>
                  <button type="button" className="btn btn-primario" disabled={pendente} onClick={() => rodar(() => decidirServico(s.id, "aprovado"))}>
                    Aprovar
                  </button>
                  <button type="button" className="btn" disabled={pendente} onClick={() => rodar(() => decidirServico(s.id, "recusado"))}>
                    Recusar
                  </button>
                </>
              )}
              {s.status === "recusado" && (
                <button type="button" className="btn btn-discreto" disabled={pendente} onClick={() => rodar(() => decidirServico(s.id, "sugerido"))}>
                  Reabrir
                </button>
              )}
              <button type="button" className="btn btn-discreto" onClick={() => setEditando(true)}>
                Editar
              </button>
              {s.origem !== "perfil" && (
                <button type="button" className="btn btn-discreto" disabled={pendente} onClick={() => rodar(() => apagarServico(s.id))}>
                  Apagar
                </button>
              )}
            </div>
          )}
        </>
      )}
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
    </li>
  );
}

function Grupo({ titulo, nota, itens, podeEditar, aberto = true }: { titulo: string; nota?: string; itens: Servico[]; podeEditar: boolean; aberto?: boolean }) {
  if (itens.length === 0) return null;
  return (
    <details className="grupo" open={aberto}>
      <summary>
        <h2>
          {titulo} <span className="grupo-n">{itens.length}</span>
        </h2>
      </summary>
      {nota && <p className="nota nota-curta">{nota}</p>}
      <ul className="servicos">
        {itens.map((s) => (
          <LinhaServico key={s.id} s={s} podeEditar={podeEditar} />
        ))}
      </ul>
    </details>
  );
}

export function ServicosCliente({ cliente, servicos, podeEditar }: { cliente: Cliente; servicos: Servico[]; podeEditar: boolean }) {
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(criarServico, null);
  const [descricao, setDescricao] = useState("");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) {
      form.current?.reset();
      setDescricao("");
    }
  }, [estado]);

  const por = (st: Servico["status"]) => servicos.filter((s) => s.status === st);

  return (
    <>
      {podeEditar && (
        <details className="nova">
          <summary>Novo serviço</summary>
          <form ref={form} action={acao} className="form-grade">
            <input type="hidden" name="cliente_id" value={cliente.id} />
            <label htmlFor="sv-nome">Nome do serviço</label>
            <input id="sv-nome" name="nome" required maxLength={120} />
            <label htmlFor="sv-desc">Descrição curta</label>
            <textarea id="sv-desc" name="descricao" rows={3} required maxLength={150} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <p className="contador">{descricao.length}/150. Sem preço, prazo, garantia ou promessa.</p>
            {estado?.erro && (
              <p role="alert" className="erro">
                {estado.erro}
              </p>
            )}
            {estado?.ok && (
              <p role="status" className="sucesso">
                Serviço aprovado. A rotina coloca no perfil na próxima rodada.
              </p>
            )}
            <div>
              <button type="submit" className="btn btn-primario" disabled={pendente}>
                Incluir no perfil
              </button>
            </div>
          </form>
        </details>
      )}

      <Grupo titulo="Esperam a sua decisão" itens={por("sugerido")} podeEditar={podeEditar} />
      <Grupo
        titulo="Vão para o perfil na próxima rodada"
        nota="Aprovados. A rotina coloca no Google e confere depois de escrever."
        itens={por("aprovado")}
        podeEditar={podeEditar}
      />
      <Grupo
        titulo="Já estão no perfil do Google"
        nota={
          cliente.servicos_padrao > 0
            ? `Mais ${cliente.servicos_padrao} serviços padrão do Google, que não têm texto. Mudar a descrição aqui vira uma alteração aprovada para a próxima rodada.`
            : "Mudar a descrição aqui vira uma alteração aprovada para a próxima rodada."
        }
        itens={por("no_perfil")}
        podeEditar={podeEditar}
      />
      <Grupo titulo="Recusados" itens={por("recusado")} podeEditar={podeEditar} aberto={false} />
      {servicos.length === 0 && <p className="vazio">Nenhum serviço registrado para este cliente ainda. A próxima rodada da rotina lê o perfil e preenche esta lista.</p>}
    </>
  );
}
