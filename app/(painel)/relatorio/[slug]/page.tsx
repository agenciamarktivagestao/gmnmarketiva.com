import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Relatorio } from "@/components/Relatorio";
import { listarClientes, listarDiagnosticos, listarEventosDesde } from "@/lib/dados";
import { inicioDaBusca, montarSemana, paraOCliente } from "@/lib/semana";

export const metadata: Metadata = { title: "Relatório semanal" };

export default async function RelatorioDoCliente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agora = new Date();
  const [clientes, eventos, diagnosticos] = await Promise.all([
    listarClientes(),
    listarEventosDesde(inicioDaBusca(agora)),
    listarDiagnosticos(),
  ]);
  const cliente = clientes.find((c) => c.slug === slug);
  if (!cliente) notFound();

  const doCliente = eventos.filter((e) => e.cliente_id === cliente.id);
  const semana = montarSemana(paraOCliente(doCliente), agora);
  const deFora = montarSemana(doCliente, agora).total - semana.total;

  return (
    <>
      <div className="relatorio-barra nao-imprimir">
        <Link href={`/clientes/${cliente.slug}/semana`} className="link-secao">
          Voltar à semana de {cliente.nome}
        </Link>
        <BotaoImprimir />
      </div>
      <p className="dica-secao nao-imprimir relatorio-aviso">
        Esta é a folha para o cliente. No navegador, escolha &quot;Salvar como PDF&quot; ao imprimir.
        {deFora > 0 &&
          ` Ela mostra só o que deu certo: ${deFora === 1 ? "1 ação que falhou ou é anotação interna ficou de fora" : `${deFora} ações que falharam ou são anotações internas ficaram de fora`}.`}
      </p>
      <Relatorio cliente={cliente} semana={semana} diagnostico={diagnosticos.get(cliente.id)} geradoEm={agora} />
    </>
  );
}
