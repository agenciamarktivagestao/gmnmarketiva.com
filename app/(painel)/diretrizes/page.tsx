import Link from "next/link";
import type { Metadata } from "next";
import { FormDiretrizes } from "@/components/FormDiretrizes";
import { listarClientes, listarDiretrizes, usuarioAtual } from "@/lib/dados";

export const metadata: Metadata = { title: "Diretrizes" };

const resumo = (t: string, n = 140) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

export default async function PaginaDiretrizes() {
  const [usuario, clientes, diretrizes] = await Promise.all([usuarioAtual(), listarClientes(), listarDiretrizes()]);
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const geral = diretrizes.find((d) => d.cliente_id === null);
  const porCliente = new Map(diretrizes.filter((d) => d.cliente_id).map((d) => [d.cliente_id as string, d]));
  const pendentes = clientes.filter((c) => !porCliente.get(c.id)?.revisado).length;

  return (
    <>
      <section className="abertura">
        <h1>Ideia principal e tom</h1>
        <p className="lead">
          A rotina lê isto antes de escrever qualquer resposta, postagem ou descrição de serviço. A ideia principal vale para todos; cada cliente refina com o
          seu tom.
        </p>
      </section>

      <section aria-labelledby="t-geral">
        <h2 id="t-geral">Ideia principal do sistema</h2>
        <FormDiretrizes cliente={null} diretriz={geral} podeEditar={podeEditar} />
      </section>

      <section aria-labelledby="t-tons">
        <div className="secao-topo">
          <h2 id="t-tons">Tom de cada cliente</h2>
          {pendentes > 0 && <p className="nota nota-curta">{pendentes} ainda são propostas iniciais, esperando a sua revisão.</p>}
        </div>
        <ul className="tons">
          {clientes.map((c) => {
            const d = porCliente.get(c.id);
            return (
              <li key={c.id}>
                <div>
                  <h3>
                    <Link href={`/clientes/${c.slug}/diretrizes`}>{c.nome}</Link>
                  </h3>
                  <p className="tom-resumo">{d?.tom ? resumo(d.tom) : "Ainda sem tom definido."}</p>
                </div>
                <p className="pend-meta">
                  {d?.revisado ? (
                    <span className="etiqueta etiqueta-concluida">Revisado</span>
                  ) : (
                    <span className="etiqueta etiqueta-media">Proposta inicial</span>
                  )}
                  {d?.aprovacao === "manual" && <span className="etiqueta">Rascunho antes de publicar</span>}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
