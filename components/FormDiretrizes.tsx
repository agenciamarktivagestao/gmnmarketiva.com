"use client";

import { useActionState, useState } from "react";
import { salvarDiretrizes } from "@/app/actions";
import { PreviaGoogle } from "./PreviaGoogle";
import type { Resultado } from "@/lib/acoes-tipos";
import type { Cliente, Diretriz } from "@/lib/tipos";

export function FormDiretrizes({
  cliente,
  diretriz,
  podeEditar,
}: {
  cliente: Cliente | null; // nulo = diretriz geral do sistema
  diretriz?: Diretriz;
  podeEditar: boolean;
}) {
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(salvarDiretrizes, null);
  const [resposta, setResposta] = useState(diretriz?.exemplo_resposta ?? "");
  const [postagem, setPostagem] = useState(diretriz?.exemplo_postagem ?? "");
  const id = cliente?.id ?? "geral";
  const nome = cliente?.nome ?? "Nome do cliente";

  return (
    <div className="diretrizes-grade">
      <form action={acao} className="form-grade form-largo" aria-busy={pendente}>
        <input type="hidden" name="cliente_id" value={cliente?.id ?? ""} />
        <fieldset disabled={!podeEditar || pendente}>
          <label htmlFor={`ip-${id}`}>Ideia principal</label>
          <p className="dica">
            {cliente
              ? "Em uma ou duas frases: o que este perfil quer ser para quem procura. A rotina usa isto para decidir o que destacar."
              : "A ideia que todo o sistema segue. Vale para todos os clientes, e cada cliente pode refinar a sua."}
          </p>
          <textarea id={`ip-${id}`} name="ideia_principal" rows={4} maxLength={2000} defaultValue={diretriz?.ideia_principal ?? ""} />

          <label htmlFor={`tom-${id}`}>Tom de voz</label>
          <p className="dica">Como falar com quem lê: respostas, postagens e descrições de serviço.</p>
          <textarea id={`tom-${id}`} name="tom" rows={3} maxLength={1000} defaultValue={diretriz?.tom ?? ""} />

          <div className="linha-dupla">
            <div>
              <label htmlFor={`tr-${id}`}>Tratamento</label>
              <select id={`tr-${id}`} name="tratamento" defaultValue={diretriz?.tratamento ?? "voce"}>
                <option value="voce">Você</option>
                <option value="senhor">O senhor, a senhora</option>
                <option value="neutro">Neutro, sem tratamento direto</option>
              </select>
            </div>
            <div>
              <label htmlFor={`em-${id}`}>Emojis</label>
              <select id={`em-${id}`} name="emojis" defaultValue={diretriz?.emojis ?? "nenhum"}>
                <option value="nenhum">Nenhum</option>
                <option value="poucos">Poucos, no máximo um</option>
                <option value="livre">À vontade</option>
              </select>
            </div>
          </div>

          <label htmlFor={`as-${id}`}>Assinatura das respostas</label>
          <p className="dica">Opcional. Aparece no fim das respostas às avaliações.</p>
          <input id={`as-${id}`} name="assinatura" maxLength={120} defaultValue={diretriz?.assinatura ?? ""} />

          <label htmlFor={`us-${id}`}>Ideias e termos para usar</label>
          <textarea id={`us-${id}`} name="usar" rows={3} maxLength={600} defaultValue={diretriz?.usar ?? ""} />

          <label htmlFor={`ev-${id}`}>O que evitar</label>
          <textarea id={`ev-${id}`} name="evitar" rows={3} maxLength={600} defaultValue={diretriz?.evitar ?? ""} />

          <label htmlFor={`er-${id}`}>Exemplo de resposta a uma avaliação</label>
          <p className="dica">Use {"{nome}"} onde entra o nome de quem avaliou. A rotina copia o jeito, não o texto.</p>
          <textarea
            id={`er-${id}`}
            name="exemplo_resposta"
            rows={4}
            maxLength={700}
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
          />

          <label htmlFor={`ep-${id}`}>Exemplo de postagem</label>
          <textarea
            id={`ep-${id}`}
            name="exemplo_postagem"
            rows={4}
            maxLength={700}
            value={postagem}
            onChange={(e) => setPostagem(e.target.value)}
          />

          {cliente && (
            <>
              <label htmlFor={`ap-${id}`}>Como a rotina publica</label>
              <select id={`ap-${id}`} name="aprovacao" defaultValue={diretriz?.aprovacao ?? "automatica"}>
                <option value="automatica">A rotina publica sozinha, seguindo o tom</option>
                <option value="manual">A rotina só deixa rascunho para eu aprovar antes</option>
              </select>
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
            Salvo. A rotina passa a seguir a partir da próxima rodada.
          </p>
        )}
        {podeEditar && (
          <div>
            <button type="submit" className="btn btn-primario" disabled={pendente}>
              Salvar diretrizes
            </button>
          </div>
        )}
      </form>

      <aside className="diretrizes-previas" aria-label="Prévia dos exemplos">
        <PreviaGoogle
          tipo="resposta"
          cliente={nome}
          texto={resposta.replaceAll("{nome}", "Maria")}
          avaliador="Maria"
          estrelas={5}
          avaliacao="Atendimento muito bom, recomendo."
        />
        <PreviaGoogle tipo="postagem" cliente={nome} categoria={cliente?.categoria} texto={postagem} />
      </aside>
    </div>
  );
}
