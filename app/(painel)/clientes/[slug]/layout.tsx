import Link from "next/link";
import { notFound } from "next/navigation";
import { AbasCliente } from "@/components/AbasCliente";
import { listarClientes } from "@/lib/dados";

export default async function LayoutCliente({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cliente = (await listarClientes()).find((c) => c.slug === slug);
  if (!cliente) notFound();
  return (
    <>
      <p className="migalha">
        <Link href="/">Painel</Link>
      </p>
      <section className="abertura">
        <h1>{cliente.nome}</h1>
        <p className="lead">
          {[cliente.categoria, cliente.cidade].filter(Boolean).join(", ")}
          {cliente.gbp_location && <span className="id-perfil">Perfil {cliente.gbp_location.replace("locations/", "")}</span>}
        </p>
      </section>
      <AbasCliente slug={cliente.slug} />
      {children}
    </>
  );
}
