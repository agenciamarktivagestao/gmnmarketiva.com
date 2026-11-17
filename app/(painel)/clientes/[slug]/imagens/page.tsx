import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GaleriaImagens } from "@/components/GaleriaImagens";
import { chavesSupabase } from "@/lib/ambiente";
import { listarClientes, listarMidias, usuarioAtual } from "@/lib/dados";

export const metadata: Metadata = { title: "Imagens" };

export default async function PaginaImagens({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [usuario, clientes, midias] = await Promise.all([usuarioAtual(), listarClientes(), listarMidias()]);
  const cliente = clientes.find((c) => c.slug === slug);
  if (!cliente) notFound();
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const chaves = chavesSupabase();
  return (
    <GaleriaImagens
      cliente={cliente}
      midias={midias.filter((m) => m.cliente_id === cliente.id)}
      podeEditar={podeEditar}
      supabaseUrl={chaves?.url ?? null}
      supabaseChave={chaves?.chave ?? null}
    />
  );
}
