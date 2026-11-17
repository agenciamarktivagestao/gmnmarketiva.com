import Link from "next/link";
import { Fase } from "./Fase";
import { CAMPOS } from "@/lib/rotulos";
import type { Cliente, Diagnostico, Pendencia } from "@/lib/tipos";

export function Matriz({
  clientes,
  diagnosticos,
  pendencias,
}: {
  clientes: Cliente[];
  diagnosticos: Map<string, Diagnostico>;
  pendencias: Pendencia[];
}) {
  const abertas = (id: string) => pendencias.filter((p) => p.cliente_id === id && (p.status === "aberta" || p.status === "aprovada"));

  return (
    <div className="matriz-rolagem">
      <table className="matriz">
        <caption className="sr-only">Situação de cada campo do perfil por cliente</caption>
        <thead>
          <tr>
            <th scope="col" className="matriz-cliente">
              Cliente
            </th>
            {CAMPOS.map((c) => (
              <th key={c.chave} scope="col" className="matriz-campo">
                <span>{c.nome}</span>
              </th>
            ))}
            <th scope="col" className="matriz-pend">
              Abertas
            </th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((cli) => {
            const d = diagnosticos.get(cli.id);
            const abertasCli = abertas(cli.id);
            const altas = abertasCli.filter((p) => p.prioridade === "alta").length;
            return (
              <tr key={cli.id}>
                <th scope="row" className="matriz-cliente">
                  <Link href={`/clientes/${cli.slug}`}>{cli.nome}</Link>
                </th>
                {CAMPOS.map((c) => {
                  const campo = d?.campos?.[c.chave];
                  return (
                    <td key={c.chave} className="matriz-celula" title={campo ? `${c.nome}: ${campo.valor}` : c.nome}>
                      {campo ? (
                        <>
                          <Fase nivel={campo.nivel} />
                          <span className="sr-only">{campo.valor}</span>
                        </>
                      ) : (
                        <span aria-hidden>–</span>
                      )}
                    </td>
                  );
                })}
                <td className="matriz-pend">
                  <Link href={`/pendencias?cliente=${cli.slug}`}>{abertasCli.length}</Link>
                  {altas > 0 && <span className="matriz-altas">{altas} {altas === 1 ? "alta" : "altas"}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
