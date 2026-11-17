import Link from "next/link";
import type { Metadata } from "next";
import { Triagem } from "@/components/Triagem";
import { agrupar } from "@/lib/agrupar";
import { modoDemonstracao } from "@/lib/ambiente";
import { listarClientes, listarPendencias, usuarioAtual } from "@/lib/dados";
import { QUEM_ABA } from "@/lib/rotulos";
import { cartoesDe, ordenarAbertas } from "@/lib/triagem";

export const metadata: Metadata = { title: "Triagem de pendências" };

const FILAS = [
  { valor: "todas", nome: "Todas" },
  { valor: "voce", nome: QUEM_ABA.voce },
  { valor: "eu", nome: QUEM_ABA.eu },
  { valor: "bloq", nome: QUEM_ABA.bloq },
] as const;

export default async function PaginaTriagem({ searchParams }: { searchParams: Promise<{ quem?: string }> }) {
  const busca = await searchParams;
  const fila = FILAS.find((f) => f.valor === busca.quem)?.valor ?? "todas";
  const [usuario, clientes, todas] = await Promise.all([usuarioAtual(), listarClientes(), listarPendencias()]);
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const abertas = todas.filter((p) => p.status === "aberta");
  const contagem = (valor: string) => (valor === "todas" ? abertas.length : abertas.filter((p) => p.quem === valor).length);
  const naFila = ordenarAbertas(fila === "todas" ? abertas : abertas.filter((p) => p.quem === fila));
  const cartoes = cartoesDe(agrupar(naFila));
  const clientesPorId = Object.fromEntries(clientes.map((c) => [c.id, { slug: c.slug, nome: c.nome }]));
  const href = (valor: string) => (valor === "todas" ? "/pendencias/triagem" : `/pendencias/triagem?quem=${valor}`);

  return (
    <>
      <section className="abertura">
        <h1>Triagem de pendências</h1>
        <p className="lead">
          Uma pendência por vez, das mais urgentes e antigas para as mais recentes. Cada decisão é gravada como na lista, e a rotina lê na próxima
          rodada. Pendências iguais de vários perfis contam como um card só. <Link href="/pendencias">Ver a lista completa</Link>.
        </p>
      </section>

      <nav aria-label="Fila da triagem" className="abas abas-pendencias">
        {FILAS.map((f) => (
          <Link key={f.valor} href={href(f.valor)} aria-current={fila === f.valor ? "page" : undefined}>
            {f.nome} <span className="aba-n">({contagem(f.valor)})</span>
          </Link>
        ))}
      </nav>

      <Triagem key={fila} cartoes={cartoes} abertas={naFila} clientes={clientesPorId} podeEditar={podeEditar} demo={modoDemonstracao()} />
    </>
  );
}
