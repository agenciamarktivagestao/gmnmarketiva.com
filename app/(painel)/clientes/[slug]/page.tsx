import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Fase } from "@/components/Fase";
import { ItemPendencia } from "@/components/ItemPendencia";
import { listarClientes, listarDiagnosticos, listarHistorico, listarPendencias, usuarioAtual } from "@/lib/dados";
import { CAMPOS, NIVEL, TIPO_EVENTO, dataCurta, hora, ordenarPendencias } from "@/lib/rotulos";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cliente = (await listarClientes()).find((c) => c.slug === slug);
  return { title: cliente?.nome ?? "Cliente" };
}

export default async function PaginaCliente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [usuario, clientes, diagnosticos, pendencias, historico] = await Promise.all([
    usuarioAtual(),
    listarClientes(),
    listarDiagnosticos(),
    listarPendencias(),
    listarHistorico(),
  ]);
  const cliente = clientes.find((c) => c.slug === slug);
  if (!cliente) notFound();

  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const d = diagnosticos.get(cliente.id);
  const minhas = ordenarPendencias(pendencias.filter((p) => p.cliente_id === cliente.id));
  const eventos = historico.filter((e) => e.cliente_id === cliente.id).slice(0, 12);
  const numero = (n: number) => n.toLocaleString("pt-BR");

  return (
    <>
      {d && (
        <dl className="desempenho" aria-label="Desempenho nos últimos 30 dias">
          <div>
            <dt>Impressões</dt>
            <dd>{numero(d.impressoes)}</dd>
          </div>
          <div>
            <dt>Ligações</dt>
            <dd>{numero(d.ligacoes)}</dd>
          </div>
          <div>
            <dt>Pedidos de rota</dt>
            <dd>{numero(d.rotas)}</dd>
          </div>
          <div>
            <dt>Cliques no site</dt>
            <dd>{numero(d.cliques_site)}</dd>
          </div>
        </dl>
      )}

      <div className="cliente-grade">
        <section aria-labelledby="t-perfil">
          <h2 id="t-perfil">Perfil no Google</h2>
          {d ? (
            <ul className="campos">
              {CAMPOS.map((c) => {
                const campo = d.campos[c.chave];
                if (!campo) return null;
                return (
                  <li key={c.chave}>
                    <Fase nivel={campo.nivel} />
                    <span className="campo-nome">{c.nome}</span>
                    <span className="campo-valor">{campo.valor}</span>
                    <span className="sr-only">{NIVEL[campo.nivel]}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="vazio">Este cliente ainda não foi lido. A próxima rodada da rotina registra a situação do perfil.</p>
          )}

          <h2>O que a rotina já fez</h2>
          {eventos.length === 0 ? (
            <p className="vazio">Nada registrado para este cliente ainda.</p>
          ) : (
            <ul className="eventos">
              {eventos.map((e) => (
                <li key={e.id}>
                  <p className="evento-quando">
                    {dataCurta(e.ocorreu_em)} {hora(e.ocorreu_em)}
                  </p>
                  <p>
                    <span className="etiqueta">{TIPO_EVENTO[e.tipo] ?? e.tipo}</span> {e.resumo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="t-pend">
          <h2 id="t-pend">Pendências ({minhas.filter((p) => p.status === "aberta" || p.status === "aprovada").length} abertas)</h2>
          {minhas.length === 0 ? (
            <p className="vazio">Nenhuma pendência para este cliente.</p>
          ) : (
            <ul className="lista-pend">
              {minhas.map((p) => (
                <ItemPendencia key={p.id} p={p} cliente={cliente} podeEditar={podeEditar} mostrarCliente={false} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
