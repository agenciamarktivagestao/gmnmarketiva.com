import Link from "next/link";
import { DIAS_DE_FALHA, nadaPedeAtencao } from "@/lib/alertas";
import type { Atencao as DadosDeAtencao } from "@/lib/alertas";
import { diaChave, quandoFoi } from "@/lib/semana";
import type { Dia } from "@/lib/semana";
import type { Cliente } from "@/lib/tipos";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// O que pede atenção no Painel. Quando não há nada, uma linha só diz que está tudo em ordem.
export function Atencao({ atencao, clientes, dias }: { atencao: DadosDeAtencao; clientes: Cliente[]; dias: Dia[] }) {
  const porId = new Map(clientes.map((c) => [c.id, c]));

  if (nadaPedeAtencao(atencao)) {
    return (
      <p className="atencao-ok">
        Nada pede atenção: a rotina registrou a noite, não houve falhas nos últimos {DIAS_DE_FALHA} dias e todos os clientes tiveram ação nos
        últimos 7 dias.
      </p>
    );
  }

  const { rotina, falhas, semAcao } = atencao;
  const clientesSemAcao = semAcao.flatMap((id) => porId.get(id) ?? []);

  return (
    <section className="atencao" aria-labelledby="t-atencao">
      <h2 id="t-atencao">Pede atenção</h2>
      <ul className="atencao-lista">
        {rotina && (
          <li className="atencao-alto">
            <p className="atencao-titulo">
              A rotina não registrou nada no painel {rotina.ultima ? `desde ${quandoFoi(rotina.ultima, dias)}` : "nos últimos 7 dias"}.
            </p>
            <p className="atencao-detalhe">
              Ela deve rodar todo dia, das 02:30 às 04:30. Confira se a tarefa agendada está ligada e com o Supabase conectado.{" "}
              <Link href="/rotina">Abrir Rotina</Link>
            </p>
          </li>
        )}

        {falhas.total > 0 && (
          <li className="atencao-medio">
            <p className="atencao-titulo">
              {plural(falhas.total, "ação falhou", "ações falharam")} nos últimos {DIAS_DE_FALHA} dias.
            </p>
            <ul className="atencao-itens">
              {falhas.recentes.map((e) => {
                const cli = e.cliente_id ? porId.get(e.cliente_id) : undefined;
                return (
                  <li key={e.id}>
                    {cli ? <Link href={`/clientes/${cli.slug}/semana#dia-${diaChave(e.ocorreu_em)}`}>{cli.nome}</Link> : "Todos os perfis"}
                    : {e.resumo} <span className="atencao-quando">({quandoFoi(e.ocorreu_em, dias)})</span>
                  </li>
                );
              })}
            </ul>
            {falhas.total > falhas.recentes.length && (
              <p className="atencao-detalhe">
                E mais {falhas.total - falhas.recentes.length}. <Link href="/semana">Ver tudo em Últimos 7 dias</Link>
              </p>
            )}
          </li>
        )}

        {clientesSemAcao.length > 0 && (
          <li className="atencao-medio">
            <p className="atencao-titulo">
              {plural(clientesSemAcao.length, "cliente está", "clientes estão")} sem nenhuma ação nos últimos 7 dias.
            </p>
            <ul className="atencao-nomes">
              {clientesSemAcao.map((c) => (
                <li key={c.id}>
                  <Link href={`/clientes/${c.slug}/semana`}>{c.nome}</Link>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </section>
  );
}
