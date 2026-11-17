import Link from "next/link";
import { ItemPendencia } from "@/components/ItemPendencia";
import { Matriz } from "@/components/Matriz";
import { Fase } from "@/components/Fase";
import { listarClientes, listarDiagnosticos, listarPendencias, usuarioAtual } from "@/lib/dados";
import { dataCurta, ordenarPendencias } from "@/lib/rotulos";

export default async function Painel() {
  const [usuario, clientes, diagnosticos, pendencias] = await Promise.all([
    usuarioAtual(),
    listarClientes(),
    listarDiagnosticos(),
    listarPendencias(),
  ]);
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const abertas = pendencias.filter((p) => p.status === "aberta" || p.status === "aprovada");
  const esperam = pendencias.filter((p) => p.quem === "voce" && p.status === "aberta");
  const altas = abertas.filter((p) => p.prioridade === "alta").length;
  const fila = ordenarPendencias(esperam).slice(0, 5);
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const leitura = [...diagnosticos.values()].map((d) => d.lido_em).sort().at(-1);

  return (
    <>
      <section className="abertura">
        <h1>
          {esperam.length === 0
            ? "Nada espera a sua decisão"
            : `${esperam.length} ${esperam.length === 1 ? "pendência espera" : "pendências esperam"} a sua decisão`}
        </h1>
        <p className="lead">
          Há {abertas.length} pendências abertas em {clientes.length} perfis, {altas} com prioridade alta.
          {leitura && ` Última leitura dos perfis em ${dataCurta(`${leitura}T12:00:00Z`)}, com dados dos últimos 30 dias.`}
        </p>
      </section>

      <div className="painel-grade">
        <section aria-labelledby="t-matriz">
          <div className="secao-topo">
            <h2 id="t-matriz">Situação de cada perfil</h2>
            <ul className="legenda" aria-label="Legenda">
              <li>
                <Fase nivel="ok" /> Em ordem
              </li>
              <li>
                <Fase nivel="rever" /> A rever
              </li>
              <li>
                <Fase nivel="falta" /> Falta
              </li>
            </ul>
          </div>
          <Matriz clientes={clientes} diagnosticos={diagnosticos} pendencias={pendencias} />
        </section>

        <aside aria-labelledby="t-fila" className="fila">
          <div className="secao-topo">
            <h2 id="t-fila">Esperam você</h2>
            <Link href="/pendencias?quem=voce" className="link-secao">
              Ver as {esperam.length}
            </Link>
          </div>
          {fila.length === 0 ? (
            <p className="vazio">Nenhuma decisão pendente. A rotina segue com o que já foi aprovado.</p>
          ) : (
            <ul className="lista-pend">
              {fila.map((p) => (
                <ItemPendencia key={p.id} p={p} cliente={p.cliente_id ? porId.get(p.cliente_id) : undefined} podeEditar={podeEditar} />
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
