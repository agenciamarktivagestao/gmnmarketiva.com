import Link from "next/link";
import type { Metadata } from "next";
import { DiaADia } from "@/components/DiaADia";
import { FaixaSemana } from "@/components/FaixaSemana";
import { MapaSemana } from "@/components/MapaSemana";
import { ResumoSemana } from "@/components/ResumoSemana";
import { listarClientes, listarEventosDesde } from "@/lib/dados";
import { JANELA_ROTINA, inicioDaBusca, montarSemana, quandoFoi, resumirPorCliente } from "@/lib/semana";

export const metadata: Metadata = { title: "Últimos 7 dias" };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function Semana() {
  const agora = new Date();
  const [clientes, eventos] = await Promise.all([listarClientes(), listarEventosDesde(inicioDaBusca(agora))]);
  const semana = montarSemana(eventos, agora);
  const porCliente = resumirPorCliente(semana);
  // Quem teve mais ações vem primeiro; quem não teve nenhuma fica por último, e dentro de cada grupo vale a ordem da lista de clientes
  const linhas = clientes.map((c, i) => ({ c, i, r: porCliente[c.id] })).sort((a, b) => (b.r?.total ?? 0) - (a.r?.total ?? 0) || a.i - b.i);

  return (
    <>
      <section className="abertura">
        <h1>Últimos 7 dias</h1>
        <p className="lead">
          Tudo o que a rotina da madrugada ({JANELA_ROTINA}) e a equipe fizeram nos perfis, dia a dia e cliente por cliente.
        </p>
      </section>

      <ResumoSemana semana={semana} rotulo="Resumo dos últimos 7 dias" />

      {semana.total === 0 ? (
        <p className="vazio">Nada registrado nos últimos 7 dias. Quando a rotina da madrugada agir, tudo aparece aqui.</p>
      ) : (
        <>
          <section aria-labelledby="t-mapa" className="semana-bloco">
            <h2 id="t-mapa">Mapa da semana</h2>
            <p className="dica-secao">Quantas ações de cada tipo houve em cada dia. Toque num dia para ver o que foi feito nele.</p>
            <MapaSemana semana={semana} legenda="Ações por tipo e por dia, nos últimos 7 dias" />
          </section>

          <section aria-labelledby="t-clientes" className="semana-bloco">
            <h2 id="t-clientes">Cada cliente</h2>
            <p className="dica-secao">Quem recebeu mais ações vem primeiro. Toque num cliente para ver a semana dele.</p>
            <ul className="semana-clientes">
              {linhas.map(({ c, r }) => (
                <li key={c.id}>
                  <Link href={`/clientes/${c.slug}/semana`} className="semana-cliente-linha">
                    <span className="semana-cliente-nome">{c.nome}</span>
                    <FaixaSemana dias={semana.dias} porDia={r?.porDia ?? {}} />
                    <span className="semana-cliente-conta">
                      {r ? (
                        <>
                          <strong>{r.total}</strong> {r.total === 1 ? "ação" : "ações"}
                          {r.falhas > 0 && <span className="semana-falhas">{plural(r.falhas, "falhou", "falharam")}</span>}
                          {r.ultimo && <span className="semana-cliente-ultima">última: {quandoFoi(r.ultimo, semana.dias)}</span>}
                        </>
                      ) : (
                        <span className="semana-cliente-ultima">Nenhuma ação nesta semana</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="t-dia" className="semana-bloco">
            <h2 id="t-dia">Dia a dia</h2>
            <p className="dica-secao">Do dia mais recente para o mais antigo, com as ações agrupadas por cliente.</p>
            <DiaADia semana={semana} clientes={clientes} agrupar />
          </section>
        </>
      )}
    </>
  );
}
