import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ServicosCliente } from "@/components/ServicosCliente";
import { listarClientes, listarServicos, usuarioAtual } from "@/lib/dados";

export const metadata: Metadata = { title: "Serviços" };

export default async function PaginaServicos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [usuario, clientes, servicos] = await Promise.all([usuarioAtual(), listarClientes(), listarServicos()]);
  const cliente = clientes.find((c) => c.slug === slug);
  if (!cliente) notFound();
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  return (
    <>
      <p className="nota">
        Os serviços aparecem no perfil do Google com nome e descrição. O que você aprova ou escreve aqui, a rotina coloca no perfil na próxima rodada e
        confere depois.
      </p>
      <ServicosCliente cliente={cliente} servicos={servicos.filter((s) => s.cliente_id === cliente.id)} podeEditar={podeEditar} />
    </>
  );
}
