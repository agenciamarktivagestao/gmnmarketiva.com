import Link from "next/link";
import type { Metadata } from "next";
import { FormNovaPendencia } from "@/components/FormNovaPendencia";
import { ItemPendencia } from "@/components/ItemPendencia";
import { listarClientes, listarPendencias, usuarioAtual } from "@/lib/dados";
import { ordenarPendencias } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Pendências" };

type Busca = { quem?: string; prioridade?: string; status?: string; cliente?: string };

const QUEM_OPC = [
  ["", "Todas"],
  ["voce", "Dependem de você"],
  ["eu", "A rotina faz"],
  ["bloq", "Chrome ou plano pago"],
];
const PRIO_OPC = [
  ["", "Todas"],
  ["alta", "Alta"],
  ["media", "Média"],
  ["baixa", "Baixa"],
];
const STATUS_OPC = [
  ["abertas", "Abertas"],
  ["aberta", "Sem decisão"],
  ["aprovada", "Aprovadas"],
  ["recusada", "Recusadas"],
  ["concluida", "Feitas"],
  ["todas", "Todas"],
];

export default async function Pendencias({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams;
  const status = busca.status ?? "abertas";
  const [usuario, clientes, todas] = await Promise.all([usuarioAtual(), listarClientes(), listarPendencias()]);
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const cliente = clientes.find((c) => c.slug === busca.cliente);

  const filtradas = ordenarPendencias(
    todas.filter((p) => {
      if (busca.quem && p.quem !== busca.quem) return false;
      if (busca.prioridade && p.prioridade !== busca.prioridade) return false;
      if (status === "abertas" && !(p.status === "aberta" || p.status === "aprovada")) return false;
      if (status !== "abertas" && status !== "todas" && p.status !== status) return false;
      if (busca.cliente === "todos" && p.cliente_id) return false;
      if (cliente && p.cliente_id !== cliente.id) return false;
      return true;
    }),
  );

  const href = (mudar: Partial<Busca>) => {
    const novo = { ...busca, ...mudar };
    const q = new URLSearchParams();
    Object.entries(novo).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    return s ? `/pendencias?${s}` : "/pendencias";
  };

  const grupo = (titulo: string, chave: keyof Busca, opcoes: string[][], atual: string) => (
    <div className="filtro">
      <p className="filtro-nome" id={`f-${chave}`}>
        {titulo}
      </p>
      <ul aria-labelledby={`f-${chave}`}>
        {opcoes.map(([valor, rotulo]) => (
          <li key={valor}>
            <Link href={href({ [chave]: valor })} aria-current={atual === valor ? "true" : undefined} className="chip">
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <section className="abertura">
        <h1>Pendências</h1>
        <p className="lead">
          Aprove o que a rotina da madrugada pode executar, recuse o que não deve ser feito e deixe comentários com o que mudou.
          A rotina lê as decisões na próxima rodada.
        </p>
      </section>

      {podeEditar && <FormNovaPendencia clientes={clientes} />}

      <div className="filtros">
        {grupo("Quem resolve", "quem", QUEM_OPC, busca.quem ?? "")}
        {grupo("Prioridade", "prioridade", PRIO_OPC, busca.prioridade ?? "")}
        {grupo("Situação", "status", STATUS_OPC, status)}
        <div className="filtro">
          <p className="filtro-nome" id="f-cliente">
            Cliente
          </p>
          <ul aria-labelledby="f-cliente">
            <li>
              <Link href={href({ cliente: "" })} className="chip" aria-current={!busca.cliente ? "true" : undefined}>
                Todos
              </Link>
            </li>
            <li>
              <Link href={href({ cliente: "todos" })} className="chip" aria-current={busca.cliente === "todos" ? "true" : undefined}>
                Gerais
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

      <p className="contagem" aria-live="polite">
        {filtradas.length} {filtradas.length === 1 ? "pendência" : "pendências"}
      </p>
      {filtradas.length === 0 ? (
        <p className="vazio">Nenhuma pendência com esses filtros. Troque a situação ou o cliente para ver mais.</p>
      ) : (
        <ul className="lista-pend lista-larga">
          {filtradas.map((p) => (
            <ItemPendencia key={p.id} p={p} cliente={p.cliente_id ? porId.get(p.cliente_id) : undefined} podeEditar={podeEditar} />
          ))}
        </ul>
      )}
    </>
  );
}
