import Link from "next/link";
import { ORIGEM, agruparDiaPorCliente } from "@/lib/semana";
import type { Semana } from "@/lib/semana";
import { TIPO_EVENTO, hora } from "@/lib/rotulos";
import type { Cliente, Evento } from "@/lib/tipos";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const primeiraMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Linha({ e }: { e: Evento }) {
  return (
    <li className={e.ok ? undefined : "evento-falhou"}>
      <p className="evento-quando">{hora(e.ocorreu_em)}</p>
      <div>
        <p>
          <span className="etiqueta">{TIPO_EVENTO[e.tipo] ?? e.tipo}</span>{" "}
          <span className="etiqueta etiqueta-origem">{ORIGEM[e.origem] ?? e.origem}</span>
          {!e.ok && (
            <>
              {" "}
              <span className="etiqueta etiqueta-alta">Falhou</span>
            </>
          )}
        </p>
        <p className="evento-resumo">{e.resumo}</p>
        {e.detalhe && <p className="evento-detalhe">{e.detalhe}</p>}
      </div>
    </li>
  );
}

// O que foi feito em cada dia, do mais recente para o mais antigo. Na visão geral (agrupar), cada dia
// mostra os clientes e, dentro de cada um, as ações dele: é o "quem fez o quê" da semana.
export function DiaADia({ semana, clientes, agrupar }: { semana: Semana; clientes: Cliente[]; agrupar: boolean }) {
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const ordem = clientes.map((c) => c.id);
  return (
    <>
      {[...semana.dias].reverse().map((d) => {
        const lista = semana.porDia[d.chave];
        return (
          <section key={d.chave} id={`dia-${d.chave}`} className="dia semana-dia" aria-labelledby={`t-dia-${d.chave}`}>
            <h3 id={`t-dia-${d.chave}`}>
              {primeiraMaiuscula(d.longo)}
              {d.hoje && " (hoje)"}
              {lista.length > 0 && <span className="semana-dia-conta">{plural(lista.length, "ação", "ações")}</span>}
            </h3>
            {lista.length === 0 ? (
              <p className="semana-dia-vazio">Nada registrado neste dia.</p>
            ) : agrupar ? (
              <ul className="semana-arvore">
                {agruparDiaPorCliente(lista, ordem).map((g) => {
                  const cli = g.clienteId ? porId.get(g.clienteId) : undefined;
                  return (
                    <li key={g.clienteId ?? "geral"}>
                      <p className="semana-cliente">
                        {cli ? <Link href={`/clientes/${cli.slug}/semana`}>{cli.nome}</Link> : "Todos os perfis"}
                        <span className="semana-dia-conta">{plural(g.eventos.length, "ação", "ações")}</span>
                      </p>
                      <ul className="eventos eventos-largo">
                        {g.eventos.map((e) => (
                          <Linha key={e.id} e={e} />
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="eventos eventos-largo">
                {lista.map((e) => (
                  <Linha key={e.id} e={e} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
