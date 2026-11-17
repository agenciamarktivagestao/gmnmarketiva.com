import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PerfilCliente } from "@/components/PerfilCliente";
import { lerPerfil, listarClientes, listarDiagnosticos, listarHistorico, listarPendencias, usuarioAtual } from "@/lib/dados";
import { ordenarPendencias } from "@/lib/rotulos";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cliente = (await listarClientes()).find((c) => c.slug === slug);
  return { title: cliente?.nome ?? "Cliente" };
}

export default async function PaginaCliente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [usuario, clientes, diagnosticos, pendencias, historico] = await Promise.all([
    usuarioAtual(),
    listarClientes(),
    listarDiagnosticos(),
    listarPendencias(),
    listarHistorico(),
  ]);
  const cliente = clientes.find((c) => c.slug === slug);
  if (!cliente) notFound();

  const diagnostico = diagnosticos.get(cliente.id);
  const perfil = await lerPerfil(cliente, diagnostico);

  return (
    <PerfilCliente
      cliente={cliente}
      perfil={perfil}
      diagnostico={diagnostico}
      pendencias={ordenarPendencias(pendencias.filter((p) => p.cliente_id === cliente.id))}
      eventos={historico.filter((e) => e.cliente_id === cliente.id).slice(0, 12)}
      podeEditar={usuario?.papel === "admin" || usuario?.papel === "editor"}
    />
  );
}
