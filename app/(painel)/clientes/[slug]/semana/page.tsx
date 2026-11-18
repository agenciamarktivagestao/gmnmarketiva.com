import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DiaADia } from "@/components/DiaADia";
import { MapaSemana } from "@/components/MapaSemana";
import { ResumoSemana } from "@/components/ResumoSemana";
import { listarClientes, listarEventosDesde } from "@/lib/dados";
import { JANELA_ROTINA, inicioDaBusca, montarSemana } from "@/lib/semana";

export const metadata: Metadata = { title: "Últimos 7 dias" };

export default async function SemanaDoCliente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agora = new Date();
  const [clientes, eventos] = await Promise.all([listarClientes(), listarEventosDesde(inicioDaBusca(agora))]);
  const cliente = clientes.find((c) => c.slug === slug);
  if (!cliente) notFound();
  const semana = montarSemana(
    eventos.filter((e) => e.cliente_id === cliente.id),
    agora,
  );

  return (
    <>
      <p className="dica-secao semana-intro">
        O que a rotina da madrugada ({JANELA_ROTINA}) e a equipe fizeram no perfil de {cliente.nome} nos últimos 7 dias.
      </p>
      <ResumoSemana semana={semana} rotulo={`Resumo dos últimos 7 dias de ${cliente.nome}`} />
      <p className="semana-acoes">
        <Link className="link-secao" href={`/relatorio/${cliente.slug}`}>
          Abrir o relatório para o cliente (imprimir ou salvar em PDF)
        </Link>
      </p>

      {semana.total === 0 ? (
        <p className="vazio">Nenhuma ação registrada para este cliente nos últimos 7 dias.</p>
      ) : (
        <>
          <section aria-labelledby="t-mapa" className="semana-bloco">
            <h2 id="t-mapa">Mapa da semana</h2>
            <p className="dica-secao">Quantas ações de cada tipo houve em cada dia. Toque num dia para ver o que foi feito nele.</p>
            <MapaSemana semana={semana} legenda={`Ações de ${cliente.nome} por tipo e por dia, nos últimos 7 dias`} />
          </section>
          <section aria-labelledby="t-dia" className="semana-bloco">
            <h2 id="t-dia">Dia a dia</h2>
            <DiaADia semana={semana} clientes={clientes} agrupar={false} />
          </section>
        </>
      )}
    </>
  );
}
