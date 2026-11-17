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
  // "Depende de você" é o caso comum e não vira etiqueta; só as exceções aparecem.
  const excecao = p.quem !== "voce";
  // Perguntas que pedem escolha, dado ou foto precisam de mais largura que um botão
  const larga = p.status === "aberta" && podeEditar && (p.kind === "choose" || p.kind === "input" || p.kind === "upload");
  return (
    <li className={`pend pend-${p.prioridade} pend-${p.status}${larga ? " pend-larga" : ""}`}>
      <div className="pend-corpo">
        {mostrarCliente && (
          <p className="pend-cliente">
            {cliente ? <Link href={`/clientes/${cliente.slug}`}>{cliente.nome}</Link> : "Todos os perfis"}
          </p>
        )}
        <h3>
          {p.titulo}
          {/* A borda mostra a prioridade; leitores de tela recebem o texto */}
          <span className="sr-only">. Prioridade {PRIORIDADE[p.prioridade].toLowerCase()}.</span>
        </h3>
        {p.detalhe && <p className="pend-detalhe">{p.detalhe}</p>}
        {p.resposta?.resumo && p.status !== "aberta" && (
          <p className="pend-resposta">
            <strong>Resposta:</strong> {p.resposta.resumo}
          </p>
        )}
        {(excecao || p.status !== "aberta") && (
          <p className="pend-meta">
            {excecao && <span className="etiqueta">{QUEM[p.quem]}</span>}
            {p.status !== "aberta" && (
              <span className={`etiqueta etiqueta-${p.status}`}>
                {STATUS[p.status]}
                {p.decidido_por && p.decidido_em ? ` por ${p.decidido_por.split("@")[0]} em ${dataCurta(p.decidido_em)}` : ""}
              </span>
            )}
          </p>
        )}
      </div>
      <AcoesPendencia p={p} podeEditar={podeEditar} />
    </li>
  );
}
