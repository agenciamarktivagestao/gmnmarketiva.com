"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { adicionarMembro, removerMembro } from "@/app/actions";
import type { Resultado } from "@/lib/acoes-tipos";
import type { Membro } from "@/lib/tipos";

const PAPEL = { admin: "Administrador", editor: "Editor", leitura: "Só leitura" } as const;

export function ListaEquipe({ membros, souAdmin, meuEmail }: { membros: Membro[]; souAdmin: boolean; meuEmail: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [estado, acao, adicionando] = useActionState<Resultado | null, FormData>(adicionarMembro, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) form.current?.reset();
  }, [estado]);

  return (
    <>
      <ul className="equipe-lista">
        {membros.map((m) => (
          <li key={m.email}>
            <div>
              <p className="equipe-nome">{m.nome || m.email}</p>
              {m.nome && <p className="equipe-email">{m.email}</p>}
            </div>
            <span className="etiqueta">{PAPEL[m.papel]}</span>
            {souAdmin && m.email !== meuEmail && (
              <button
                type="button"
                className="btn btn-discreto"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    setErro(null);
                    const r = await removerMembro(m.email);
                    if (r.erro) setErro(r.erro);
                  })
                }
              >
                Remover acesso
              </button>
            )}
          </li>
        ))}
      </ul>
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}

      {souAdmin ? (
        <form ref={form} action={acao} className="form-grade">
          <h2>Liberar um e-mail</h2>
          <label htmlFor="eq-email">E-mail</label>
          <input id="eq-email" name="email" type="email" required />
          <label htmlFor="eq-nome">Nome</label>
          <input id="eq-nome" name="nome" />
          <label htmlFor="eq-papel">Papel</label>
          <select id="eq-papel" name="papel" defaultValue="editor">
            <option value="editor">Editor: decide e comenta</option>
            <option value="leitura">Só leitura</option>
            <option value="admin">Administrador: também libera acessos</option>
          </select>
          {estado?.erro && (
            <p role="alert" className="erro">
              {estado.erro}
            </p>
          )}
          {estado?.ok && (
            <p role="status" className="sucesso">
              E-mail liberado. A pessoa já pode criar o acesso na tela de entrada.
            </p>
          )}
          <div>
            <button type="submit" className="btn btn-primario" disabled={adicionando}>
              Liberar acesso
            </button>
          </div>
        </form>
      ) : (
        <p className="nota">Só administradores liberam ou removem acessos.</p>
      )}
    </>
  );
}
