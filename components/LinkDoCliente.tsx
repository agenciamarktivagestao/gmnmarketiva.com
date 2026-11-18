"use client";

import { useActionState, useState } from "react";
import { criarLinkCliente, desativarLinkCliente } from "@/app/actions";
import type { Resultado } from "@/lib/acoes-tipos";
import { linkPublico } from "@/lib/acompanhamento";
import type { LinkDoCliente as Link } from "@/lib/acompanhamento";
import { dataCurta, hora } from "@/lib/rotulos";

type Estado = (Resultado & { acao: string }) | null;

const vezes = (n: number) => (n === 1 ? "1 vez" : `${n} vezes`);

// Mostra o link do cliente já pronto para copiar. O estado de "copiado" mora aqui dentro e recomeça a cada link novo.
function LinkAtivo({ link, origem }: { link: Link; origem: string }) {
  const [copiado, setCopiado] = useState<"sim" | "nao" | null>(null);
  const url = linkPublico(origem, link.token);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado("sim");
    } catch {
      setCopiado("nao");
    }
  }

  return (
    <>
      <p className="link-cliente-estado">
        <span className="etiqueta etiqueta-aprovada">Ativo</span> Criado em {dataCurta(link.criado_em)}.{" "}
        {link.acessos === 0 || !link.ultimo_acesso
          ? "Ainda ninguém abriu."
          : `Aberto ${vezes(link.acessos)}; a última foi em ${dataCurta(link.ultimo_acesso)}, às ${hora(link.ultimo_acesso)}.`}
      </p>
      <label htmlFor="link-url">Endereço do link</label>
      <div className="link-cliente-linha">
        <input id="link-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-primario" onClick={copiar}>
          Copiar link
        </button>
      </div>
      <p role="status" className="link-cliente-copiado">
        {copiado === "sim" && "Link copiado."}
        {copiado === "nao" && "Não deu para copiar sozinho. O link está selecionado: copie com Ctrl+C."}
      </p>
      <p>
        <a className="link-secao" href={`${url}?equipe=1`} target="_blank" rel="noreferrer">
          Abrir como o cliente vê (não conta como acesso do cliente)
        </a>
      </p>
    </>
  );
}

export function LinkDoCliente({
  clienteId,
  clienteNome,
  link,
  origem,
  podeGerir,
}: {
  clienteId: string;
  clienteNome: string;
  link: Link | null;
  origem: string;
  podeGerir: boolean;
}) {
  const [estado, agir, pendente] = useActionState<Estado, FormData>(async (_, dados) => {
    const acao = String(dados.get("acao") ?? "");
    const r = acao === "desativar" ? await desativarLinkCliente(null, dados) : await criarLinkCliente(null, dados);
    return { ...r, acao };
  }, null);

  return (
    <section className="semana-bloco link-cliente" aria-labelledby="t-link">
      <h2 id="t-link">Link para o cliente acompanhar</h2>
      <p className="dica-secao">
        Quem tiver o link vê só a semana de {clienteNome}: o que foi feito e os números do perfil no Google. Não pede senha e não mostra nada
        de outros clientes.
      </p>

      {!podeGerir ? (
        <p className="link-cliente-nota">Só administradores veem e gerenciam este link.</p>
      ) : link ? (
        <>
          <LinkAtivo key={link.token} link={link} origem={origem} />
          <div className="link-cliente-troca">
            <details>
              <summary>Gerar um novo link</summary>
              <p>O link atual deixa de funcionar na hora. Quem o tem vai precisar do novo.</p>
              <form action={agir}>
                <input type="hidden" name="cliente" value={clienteId} />
                <button type="submit" name="acao" value="criar" className="btn" disabled={pendente}>
                  Sim, gerar um novo link
                </button>
              </form>
            </details>
            <details>
              <summary>Desativar o link</summary>
              <p>O cliente deixa de conseguir abrir a página. Você pode criar outro link quando quiser.</p>
              <form action={agir}>
                <input type="hidden" name="cliente" value={clienteId} />
                <button type="submit" name="acao" value="desativar" className="btn" disabled={pendente}>
                  Sim, desativar o link
                </button>
              </form>
            </details>
          </div>
        </>
      ) : (
        <>
          <p>Nenhum link ativo. Enquanto você não criar um, o cliente não consegue ver nada.</p>
          <form action={agir}>
            <input type="hidden" name="cliente" value={clienteId} />
            <button type="submit" name="acao" value="criar" className="btn btn-primario" disabled={pendente}>
              Criar link
            </button>
          </form>
        </>
      )}

      {estado?.erro && (
        <p role="alert" className="erro">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="sucesso">
          {estado.acao === "desativar"
            ? "Link desativado. Quem o tinha não consegue mais abrir a página."
            : "Link criado. Se havia um anterior, ele deixou de funcionar."}
        </p>
      )}
    </section>
  );
}
