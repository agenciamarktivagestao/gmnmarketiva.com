import Link from "next/link";
import type { Metadata } from "next";
import { listarClientes, listarHistorico } from "@/lib/dados";
import { TIPO_EVENTO, dataLonga, hora } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Histórico" };

export default async function Historico({ searchParams }: { searchParams: Promise<{ tipo?: string; cliente?: string }> }) {
  const busca = await searchParams;
  const [clientes, eventos] = await Promise.all([listarClientes(), listarHistorico()]);
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const cliente = clientes.find((c) => c.slug === busca.cliente);

  const filtrados = eventos.filter((e) => (!busca.tipo || e.tipo === busca.tipo) && (!cliente || e.cliente_id === cliente.id));

  const dias = new Map<string, typeof filtrados>();
  filtrados.forEach((e) => {
    const chave = dataLonga(e.ocorreu_em);
    dias.set(chave, [...(dias.get(chave) ?? []), e]);
  });

  const href = (mudar: { tipo?: string; cliente?: string }) => {
    const q = new URLSearchParams();
    const novo = { ...busca, ...mudar };
    Object.entries(novo).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    return s ? `/historico?${s}` : "/historico";
  };

  return (
    <>
      <section className="abertura">
        <h1>Histórico</h1>
        <p className="lead">O que a rotina da madrugada e a equipe fizeram nos perfis, do mais recente para o mais antigo.</p>
      </section>

      <div className="filtros">
        <div className="filtro">
          <p className="filtro-nome" id="h-tipo">
            Tipo
          </p>
          <ul aria-labelledby="h-tipo">
            <li>
              <Link href={href({ tipo: "" })} className="chip" aria-current={!busca.tipo ? "true" : undefined}>
                Todos
              </Link>
            </li>
            {Object.entries(TIPO_EVENTO).map(([k, nome]) => (
              <li key={k}>
                <Link href={href({ tipo: k })} className="chip" aria-current={busca.tipo === k ? "true" : undefined}>
                  {nome}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="filtro">
          <p className="filtro-nome" id="h-cliente">
            Cliente
          </p>
          <ul aria-labelledby="h-cliente">
            <li>
              <Link href={href({ cliente: "" })} className="chip" aria-current={!busca.cliente ? "true" : undefined}>
                Todos
              </Link>
            </li>
            {clientes.map((c) => (
              <li key={c.id}>
                <Link href={href({ cliente: c.slug })} className="chip" aria-current={busca.cliente === c.slug ? "true" : undefined}>
                  {c.nome}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="vazio">Nada registrado com esses filtros. A rotina da madrugada grava aqui cada ação que executa.</p>
      ) : (
        [...dias.entries()].map(([dia, lista]) => (
          <section key={dia} className="dia">
            <h2>{dia}</h2>
            <ul className="eventos eventos-largo">
              {lista.map((e) => {
                const cli = e.cliente_id ? porId.get(e.cliente_id) : undefined;
                return (
                  <li key={e.id} className={e.ok ? undefined : "evento-falhou"}>
                    <p className="evento-quando">{hora(e.ocorreu_em)}</p>
                    <div>
                      <p>
                        <span className="etiqueta">{TIPO_EVENTO[e.tipo] ?? e.tipo}</span>
                        {!e.ok && <span className="etiqueta etiqueta-alta">Falhou</span>}{" "}
                        {cli ? <Link href={`/clientes/${cli.slug}`}>{cli.nome}</Link> : <span>Todos os perfis</span>}
                      </p>
                      <p className="evento-resumo">{e.resumo}</p>
                      {e.detalhe && <p className="evento-detalhe">{e.detalhe}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
