import Link from "next/link";
import { AcoesPendencia } from "./AcoesPendencia";
import { PRIORIDADE, QUEM, STATUS, dataCurta } from "@/lib/rotulos";
import type { Cliente, Pendencia } from "@/lib/tipos";

export function ItemPendencia({
  p,
  cliente,
  podeEditar,
  mostrarCliente = true,
}: {
  p: Pendencia;
  cliente?: Cliente;
  podeEditar: boolean;
  mostrarCliente?: boolean;
}) {
  return (
    <li className={`pend pend-${p.prioridade} pend-${p.status}`}>
      <div className="pend-corpo">
        {mostrarCliente && (
          <p className="pend-cliente">
            {cliente ? <Link href={`/clientes/${cliente.slug}`}>{cliente.nome}</Link> : "Todos os perfis"}
          </p>
        )}
        <h3>{p.titulo}</h3>
        {p.detalhe && <p className="pend-detalhe">{p.detalhe}</p>}
        <p className="pend-meta">
          <span className={`etiqueta etiqueta-${p.prioridade}`}>Prioridade {PRIORIDADE[p.prioridade].toLowerCase()}</span>
          <span className="etiqueta">{QUEM[p.quem]}</span>
          {p.status !== "aberta" && (
            <span className={`etiqueta etiqueta-${p.status}`}>
              {STATUS[p.status]}
              {p.decidido_por && p.decidido_em ? ` por ${p.decidido_por.split("@")[0]} em ${dataCurta(p.decidido_em)}` : ""}
            </span>
          )}
        </p>
      </div>
      <AcoesPendencia id={p.id} status={p.status} comentarios={p.comentarios} podeEditar={podeEditar} />
    </li>
  );
}
