import Link from "next/link";
import type { Metadata } from "next";
import { AlertaAvaliacaoCartao } from "@/components/AlertaAvaliacaoCartao";
import { agruparPorCliente, contarPorNota, separarAlertas } from "@/lib/avaliacoes-ruins";
import { listarAlertasAvaliacao, listarClientes, usuarioAtual } from "@/lib/dados";

export const metadata: Metadata = { title: "Avaliações ruins" };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function AvaliacoesRuins() {
  const agora = new Date();
  const [usuario, clientes, alertas] = await Promise.all([usuarioAtual(), listarClientes(), listarAlertasAvaliacao()]);
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  // Só os clientes ativos entram (o painel não lista os que saíram da operação)
  const ativos = new Set(clientes.map((c) => c.id));
  const doPainel = alertas.filter((a) => ativos.has(a.cliente_id));
  const { novas } = separarAlertas(doPainel, agora);
  const porNota = contarPorNota(novas);
  const grupos = agruparPorCliente(doPainel, clientes, agora);

  return (
    <>
      <section className="abertura">
        <h1>
          {novas.length === 0 ? "Nenhuma avaliação ruim espera decisão" : `${plural(novas.length, "avaliação ruim espera", "avaliações ruins esperam")} decisão`}
        </h1>
        <p className="lead">
          A rotina da madrugada olha as avaliações de todos os perfis e avisa aqui quando a nota é 3 estrelas ou menos, ou quando o comentário é
          negativo, mesmo com nota alta. Ela não responde essas avaliações: você decide como recorrer (responder, denunciar ao Google ou deixar como está) e
          marca como tratada.
        </p>
        {novas.length > 0 && (
          <ul className="alerta-resumo" aria-label="Quantas esperam, por nota">
            {[1, 2, 3, 4, 5]
              .filter((n) => porNota[n] > 0)
              .map((n) => (
                <li key={n}>
                  <strong>{porNota[n]}</strong> {n === 1 ? "de 1 estrela" : `de ${n} estrelas`}
                </li>
              ))}
          </ul>
        )}
      </section>

      {grupos.length === 0 ? (
        <p className="vazio">
          Nada por aqui ainda. Quando a rotina achar uma avaliação ruim, ela aparece nesta página e no bloco “Pede atenção” do <Link href="/">Painel</Link>.
        </p>
      ) : (
        grupos.map((g) => (
          <section key={g.cliente.id} className="alerta-cliente" aria-labelledby={`cli-${g.cliente.id}`}>
            <div className="secao-topo">
              <h2 id={`cli-${g.cliente.id}`}>{g.cliente.nome}</h2>
              <Link href={`/clientes/${g.cliente.slug}`} className="chip">
                Abrir o cliente
              </Link>
            </div>
            <p className="dica-secao">
              {g.novas.length > 0 ? `${plural(g.novas.length, "espera", "esperam")} decisão` : "Nada espera decisão"}
              {g.tratadas.length > 0 && `; ${plural(g.tratadas.length, "tratada", "tratadas")} nos últimos 30 dias`}.
            </p>
            <div className="alerta-lista">
              {g.novas.map((a) => (
                <AlertaAvaliacaoCartao key={a.id} a={a} podeEditar={podeEditar} />
              ))}
              {g.tratadas.map((a) => (
                <AlertaAvaliacaoCartao key={a.id} a={a} podeEditar={podeEditar} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
