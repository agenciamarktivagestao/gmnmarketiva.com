"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { decidirVarias } from "@/app/actions";
import { AcoesPendencia } from "./AcoesPendencia";
import { PRIORIDADE, QUEM, STATUS } from "@/lib/rotulos";
import type { Pendencia, Prioridade, Status } from "@/lib/tipos";

type ClienteResumo = { slug: string; nome: string };

const PESO: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

// Um card para várias pendências iguais. A decisão em grupo grava uma decisão por pendência.
export function GrupoPendencias({
  titulo,
  itens,
  clientes,
  podeEditar,
}: {
  titulo: string;
  itens: Pendencia[];
  clientes: Record<string, ClienteResumo>;
  podeEditar: boolean;
}) {
  const idLista = useId();
  const [aberto, setAberto] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(itens.map((p) => p.id)));
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ erro: boolean; texto: string } | null>(null);

  const status: Status = itens[0].status;
  const quem = itens[0].quem;
  const prioridade = itens.map((p) => p.prioridade).sort((a, b) => PESO[a] - PESO[b])[0];
  const nomeDe = (p: Pendencia) => (p.cliente_id ? clientes[p.cliente_id]?.nome : undefined) ?? "Todos os perfis";
  const nomes = itens.map(nomeDe);
  const resumoNomes = nomes.length > 4 ? `${nomes.slice(0, 4).join(", ")} e mais ${nomes.length - 4}` : nomes.join(", ");

  const escolhidos = itens.filter((p) => marcados.has(p.id));
  const todos = escolhidos.length === itens.length;
  // "Aprovar todos (4)" quando tudo está marcado; "Aprovar 3 marcados" quando não
  const n = escolhidos.length;
  const rotulos = {
    aprovar: todos ? `Aprovar todos (${itens.length})` : `Aprovar ${n} ${n === 1 ? "marcado" : "marcados"}`,
    recusar: todos ? `Recusar todos (${itens.length})` : `Recusar ${n} ${n === 1 ? "marcado" : "marcados"}`,
    feito: todos ? `Marcar todos como feito (${itens.length})` : `Marcar ${n} como ${n === 1 ? "feito" : "feitos"}`,
    reabrir: todos ? `Reabrir todos (${itens.length})` : `Reabrir ${n} ${n === 1 ? "marcado" : "marcados"}`,
  };

  const alternar = (id: string) =>
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const decidir = (novo: Status, texto: string) =>
    iniciar(async () => {
      setAviso(null);
      const r = await decidirVarias(
        escolhidos.map((p) => p.id),
        novo,
        status,
      );
      if (r.erro) setAviso({ erro: true, texto: r.erro });
      else setAviso({ erro: false, texto: `${r.feitas ?? escolhidos.length} ${texto}` });
    });

  const semMarca = escolhidos.length === 0;

  return (
    <li className={`pend pend-grupo pend-${prioridade} pend-${status}`}>
      <div className="pend-corpo">
        <p className="pend-cliente">
          <span className="grupo-n-perfis">{itens.length} perfis</span>
        </p>
        <h3>
          {titulo}
          <span className="sr-only">. Prioridade {PRIORIDADE[prioridade].toLowerCase()}. {itens.length} perfis.</span>
        </h3>
        <p className="pend-detalhe grupo-nomes">{resumoNomes}</p>
        {(quem !== "voce" || status !== "aberta") && (
          <p className="pend-meta">
            {quem !== "voce" && <span className="etiqueta">{QUEM[quem]}</span>}
            {status !== "aberta" && <span className={`etiqueta etiqueta-${status}`}>{STATUS[status]}</span>}
          </p>
        )}
        <div>
          <button type="button" className="btn btn-discreto grupo-abrir" aria-expanded={aberto} aria-controls={idLista} onClick={() => setAberto(!aberto)}>
            {aberto ? "Esconder os perfis" : `Ver os ${itens.length} perfis`}
          </button>
        </div>
      </div>

      <div className="acoes" aria-busy={pendente}>
        {podeEditar && (
          <div className="acoes-botoes">
            {status === "aberta" && (
              <>
                <button type="button" className="btn btn-primario" disabled={pendente || semMarca} onClick={() => decidir("aprovada", "aprovadas.")}>
                  {rotulos.aprovar}
                </button>
                <button type="button" className="btn" disabled={pendente || semMarca} onClick={() => decidir("recusada", "recusadas.")}>
                  {rotulos.recusar}
                </button>
              </>
            )}
            {(status === "aberta" || status === "aprovada") && (
              <button type="button" className="btn" disabled={pendente || semMarca} onClick={() => decidir("concluida", "marcadas como feitas.")}>
                {rotulos.feito}
              </button>
            )}
            {status !== "aberta" && status !== "aprovada" && (
              <button type="button" className="btn btn-discreto" disabled={pendente || semMarca} onClick={() => decidir("aberta", "reabertas.")}>
                {rotulos.reabrir}
              </button>
            )}
            {status === "aprovada" && (
              <button type="button" className="btn btn-discreto" disabled={pendente || semMarca} onClick={() => decidir("aberta", "reabertas.")}>
                {rotulos.reabrir}
              </button>
            )}
          </div>
        )}
        {aviso && (
          <p role={aviso.erro ? "alert" : "status"} className={aviso.erro ? "erro" : "sucesso"}>
            {aviso.texto}
          </p>
        )}
      </div>

      {aberto && (
        <div id={idLista} className="grupo-lista-caixa">
          {podeEditar && (
            <p className="grupo-selecao">
              <button type="button" className="btn btn-discreto" onClick={() => setMarcados(new Set(itens.map((p) => p.id)))}>
                Marcar todos
              </button>
              <button type="button" className="btn btn-discreto" onClick={() => setMarcados(new Set())}>
                Desmarcar todos
              </button>
              <span className="contagem">
                {escolhidos.length} de {itens.length} marcados
              </span>
            </p>
          )}
          <ul className="grupo-lista">
            {itens.map((p) => {
              const cli = p.cliente_id ? clientes[p.cliente_id] : undefined;
              return (
                <li key={p.id} className="grupo-linha">
                  {podeEditar && (
                    <label className="grupo-marca">
                      <input type="checkbox" checked={marcados.has(p.id)} onChange={() => alternar(p.id)} />
                      <span className="sr-only">Incluir {nomeDe(p)} na decisão em grupo</span>
                    </label>
                  )}
                  <div className="grupo-conteudo">
                    <p className="grupo-cliente">{cli ? <Link href={`/clientes/${cli.slug}`}>{cli.nome}</Link> : "Todos os perfis"}</p>
                    {p.detalhe && <p className="pend-detalhe">{p.detalhe}</p>}
                    {p.prioridade !== prioridade && <p className="grupo-prio">Prioridade {PRIORIDADE[p.prioridade].toLowerCase()}</p>}
                  </div>
                  <AcoesPendencia id={p.id} status={p.status} comentarios={p.comentarios} podeEditar={podeEditar} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}
