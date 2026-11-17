import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FormDiretrizes } from "@/components/FormDiretrizes";
import { listarClientes, listarDiretrizes, usuarioAtual } from "@/lib/dados";

export const metadata: Metadata = { title: "Tom e diretrizes" };

export default async function PaginaDiretrizesCliente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [usuario, clientes, diretrizes] = await Promise.all([usuarioAtual(), listarClientes(), listarDiretrizes()]);
  const cliente = clientes.find((c) => c.slug === slug);
  if (!cliente) notFound();
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const minha = diretrizes.find((d) => d.cliente_id === cliente.id);
  const geral = diretrizes.find((d) => d.cliente_id === null);
  return (
    <>
      {minha && !minha.revisado && (
        <p className="aviso">
          Este é um rascunho de tom feito a partir do perfil. A rotina já o segue, mas confira e ajuste o que não soar como o cliente. Ao salvar, ele
          passa a valer como revisado.
        </p>
      )}
      {geral?.ideia_principal && (
        <details className="geral">
          <summary>Ideia principal do sistema, que vale para todos os clientes</summary>
          <p>{geral.ideia_principal}</p>
        </details>
      )}
      <FormDiretrizes cliente={cliente} diretriz={minha} podeEditar={podeEditar} />
    </>
  );
}
