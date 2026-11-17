"use client";

import { useActionState, useEffect, useRef } from "react";
import { novaPendencia } from "@/app/actions";
import type { Resultado } from "@/lib/acoes-tipos";
import type { Cliente } from "@/lib/tipos";

export function FormNovaPendencia({ clientes }: { clientes: Cliente[] }) {
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(novaPendencia, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) form.current?.reset();
  }, [estado]);

  return (
    <details className="nova">
      <summary>Nova pendência</summary>
      <form ref={form} action={acao} className="form-grade">
        <label htmlFor="np-cliente">Cliente</label>
        <select id="np-cliente" name="cliente_id" defaultValue="">
          <option value="">Todos os perfis</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <label htmlFor="np-titulo">O que precisa ser feito</label>
        <input id="np-titulo" name="titulo" required maxLength={200} />

        <label htmlFor="np-detalhe">Detalhes</label>
        <textarea id="np-detalhe" name="detalhe" rows={3} maxLength={2000} />

        <label htmlFor="np-quem">Quem faz</label>
        <select id="np-quem" name="quem" defaultValue="eu">
          <option value="eu">A rotina da madrugada (já nasce aprovada)</option>
          <option value="voce">A equipe ou o cliente</option>
          <option value="bloq">Só pelo Chrome ou plano pago</option>
        </select>

        <label htmlFor="np-prioridade">Prioridade</label>
        <select id="np-prioridade" name="prioridade" defaultValue="media">
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>

        {estado?.erro && (
          <p role="alert" className="erro">
            {estado.erro}
          </p>
        )}
        {estado?.ok && (
          <p role="status" className="sucesso">
            Pendência criada.
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primario" disabled={pendente}>
            Criar pendência
          </button>
        </div>
      </form>
    </details>
  );
}
