"use client";

import { useActionState, useState } from "react";
import { criarAcesso, entrar } from "@/app/actions";
import type { Resultado } from "@/lib/acoes-tipos";

export function FormLogin({ demonstracao, aviso }: { demonstracao: boolean; aviso?: string }) {
  const [criando, setCriando] = useState(false);
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(criando ? criarAcesso : entrar, null);

  return (
    <form action={acao} className="form-login">
      <h1>{criando ? "Criar acesso" : "Entrar"}</h1>
      {aviso && <p className="aviso">{aviso}</p>}
      {demonstracao && (
        <p className="aviso">Modo demonstração: o Supabase ainda não está conectado. Abra o painel pelo link abaixo.</p>
      )}
      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="senha">Senha</label>
      <input
        id="senha"
        name="senha"
        type="password"
        autoComplete={criando ? "new-password" : "current-password"}
        minLength={criando ? 8 : undefined}
        required
      />
      {estado?.erro && (
        <p role="alert" className="erro">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="sucesso">
          Acesso criado. Confirme o e-mail pelo link que enviamos e depois entre. Quem libera o seu acesso à equipe é o administrador.
        </p>
      )}
      <button type="submit" className="btn btn-primario btn-largo" disabled={pendente}>
        {criando ? "Criar acesso" : "Entrar"}
      </button>
      <button type="button" className="btn btn-discreto" onClick={() => setCriando(!criando)}>
        {criando ? "Já tenho acesso" : "Criar acesso com o e-mail da equipe"}
      </button>
    </form>
  );
}
