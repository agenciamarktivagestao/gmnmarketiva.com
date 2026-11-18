import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Relatorio } from "@/components/Relatorio";
import { tokenComFormato } from "@/lib/acompanhamento";
import { lerAcompanhamento } from "@/lib/dados";
import { dataCurta, hora } from "@/lib/rotulos";
import { montarSemana } from "@/lib/semana";

export const dynamic = "force-dynamic";

// Página sem menu e sem login, para o cliente. Não entra em buscadores e não repassa o endereço (que tem o segredo) a outros sites.
export const metadata: Metadata = {
  title: "Acompanhamento semanal",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function AcompanhamentoDoCliente({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ equipe?: string }>;
}) {
  const { token } = await params;
  const { equipe } = await searchParams;
  // ?equipe=1 é a pré-visualização da equipe: mostra a mesma página, mas não conta como acesso do cliente
  const dados = tokenComFormato(token) ? await lerAcompanhamento(token, equipe === undefined) : null;
  if (!dados) notFound();

  const agora = new Date();
  const semana = montarSemana(dados.eventos, agora);

  return (
    <main className="publico">
      <div className="relatorio-barra nao-imprimir">
        <p className="publico-nota">
          Atualizado em {dataCurta(dados.geradoEm)}, às {hora(dados.geradoEm)}. Abra de novo para ver as novidades.
        </p>
        <BotaoImprimir />
      </div>
      <Relatorio cliente={dados.cliente} semana={semana} diagnostico={dados.diagnostico} geradoEm={new Date(dados.geradoEm)} />
    </main>
  );
}
