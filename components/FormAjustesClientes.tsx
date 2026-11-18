"use client";

import { useActionState } from "react";
import { salvarAjustesClientes } from "@/app/actions";
import { ACOES_DO_CLIENTE, resumoDoCliente } from "@/lib/rotina";
import type { Resultado } from "@/lib/acoes-tipos";
import type { AjustesCliente, Cliente } from "@/lib/tipos";

export function FormAjustesClientes({
  clientes,
  ajustes,
  podeEditar,
}: {
  clientes: Cliente[];
  ajustes: Map<string, AjustesCliente>;
  podeEditar: boolean;
}) {
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(salvarAjustesClientes, null);

  return (
    <form action={acao} className="rotina-clientes" aria-busy={pendente}>
      <fieldset disabled={!podeEditar || pendente} className="rotina-lista">
        <legend className="sr-only">Ajustes de cada cliente</legend>
        {clientes.map((c) => {
          const a = ajustes.get(c.id)!;
          return (
            <details key={c.id} className="rotina-cliente" open={a.pausada || resumoDoCliente(a) !== "Tudo liberado." || a.nota !== ""}>
              <summary>
                <h3>{c.nome}</h3>
                <span className="dica">{resumoDoCliente(a)}</span>
              </summary>
              <input type="hidden" name="cliente" value={c.id} />
              <div className="rotina-cliente-opcoes">
                {ACOES_DO_CLIENTE.map((x) => (
                  <label key={x.chave} className="rotina-opcao rotina-opcao-curta">
                    <input type="checkbox" name={`${x.chave}:${c.id}`} defaultChecked={a[x.chave]} />
                    <span>{x.nome}</span>
                  </label>
                ))}
                <label className="rotina-opcao rotina-opcao-curta rotina-pausar">
                  <input type="checkbox" name={`pausada:${c.id}`} defaultChecked={a.pausada} />
                  <span>Pausar este cliente</span>
                </label>
              </div>
              <label className="rotina-nota">
                <span>Recado para a rotina (opcional)</span>
                <input
                  name={`nota:${c.id}`}
                  maxLength={300}
                  defaultValue={a.nota}
                  placeholder="Ex.: só postagens até o dono confirmar o telefone"
                />
              </label>
            </details>
          );
        })}
      </fieldset>

      {estado?.erro && (
        <p role="alert" className="erro">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="sucesso">
          Salvo. Cada cliente passa a seguir estes ajustes na próxima madrugada.
        </p>
      )}
      {podeEditar && (
        <p>
          <button type="submit" className="btn btn-primario" disabled={pendente}>
            Salvar ajustes dos clientes
          </button>
        </p>
      )}
    </form>
  );
}
