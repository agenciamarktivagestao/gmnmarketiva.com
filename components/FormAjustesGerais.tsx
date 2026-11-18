"use client";

import { useActionState } from "react";
import { salvarAjustesGerais } from "@/app/actions";
import type { Resultado } from "@/lib/acoes-tipos";
import type { AjustesRotina } from "@/lib/tipos";

const ACOES: { nome: keyof AjustesRotina; titulo: string; dica: string }[] = [
  { nome: "responder_avaliacoes", titulo: "Responder avaliações", dica: "Respostas novas e as que você aprovou no painel." },
  { nome: "publicar_postagens", titulo: "Publicar postagens", dica: "A postagem semanal de cada perfil e as aprovadas." },
  { nome: "enviar_fotos", titulo: "Enviar fotos", dica: "Fotos novas do Drive e as que ficaram na fila do painel." },
  { nome: "atualizar_servicos", titulo: "Atualizar serviços", dica: "Serviços novos e os que você aprovou." },
];

export function FormAjustesGerais({ ajustes, podeMudar }: { ajustes: AjustesRotina; podeMudar: boolean }) {
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(salvarAjustesGerais, null);

  return (
    <form action={acao} className="form-grade form-largo rotina-form" aria-busy={pendente}>
      <fieldset disabled={!podeMudar || pendente}>
        <legend className="rotina-legenda">Situação</legend>
        <label className="rotina-opcao">
          <input type="checkbox" name="ativa" defaultChecked={ajustes.ativa} />
          <span>
            <strong>A rotina está ativa</strong>
            <span className="dica">Desmarque para pausar tudo: na próxima madrugada ela só lê e registra, sem alterar nenhum perfil.</span>
          </span>
        </label>
      </fieldset>

      <fieldset disabled={!podeMudar || pendente}>
        <legend className="rotina-legenda">Quanto fazer por noite</legend>
        <div className="rotina-numeros">
          <div>
            <label htmlFor="r-meta">Meta mínima de ajustes</label>
            <input
              id="r-meta"
              name="meta_minima"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              defaultValue={ajustes.meta_minima}
              required
            />
            <p className="dica">Ela tenta chegar a pelo menos este número. Sem nada com respaldo para fazer, explica no relatório.</p>
          </div>
          <div>
            <label htmlFor="r-limite">Limite de ajustes</label>
            <input
              id="r-limite"
              name="limite_ajustes"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              defaultValue={ajustes.limite_ajustes}
              required
            />
            <p className="dica">Ao chegar nele, ela para e deixa o resto para a noite seguinte.</p>
          </div>
          <div>
            <label htmlFor="r-posts">Máximo de postagens</label>
            <input
              id="r-posts"
              name="max_postagens"
              type="number"
              inputMode="numeric"
              min={0}
              max={16}
              defaultValue={ajustes.max_postagens}
              required
            />
            <p className="dica">Conta dentro do limite de ajustes.</p>
          </div>
        </div>
      </fieldset>

      <fieldset disabled={!podeMudar || pendente}>
        <legend className="rotina-legenda">O que ela pode fazer, em todos os clientes</legend>
        {ACOES.map((a) => (
          <label key={a.nome} className="rotina-opcao">
            <input type="checkbox" name={a.nome} defaultChecked={Boolean(ajustes[a.nome])} />
            <span>
              <strong>{a.titulo}</strong>
              <span className="dica">{a.dica}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {estado?.erro && (
        <p role="alert" className="erro">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="sucesso">
          Salvo. A rotina passa a seguir estes ajustes na próxima madrugada.
        </p>
      )}
      {podeMudar ? (
        <div>
          <button type="submit" className="btn btn-primario" disabled={pendente}>
            Salvar ajustes gerais
          </button>
        </div>
      ) : (
        <p className="dica">Só administradores mudam os ajustes gerais.</p>
      )}
    </form>
  );
}
