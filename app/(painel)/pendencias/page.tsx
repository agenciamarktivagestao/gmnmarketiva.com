import Link from "next/link";
import type { Metadata } from "next";
import { FormNovaPendencia } from "@/components/FormNovaPendencia";
import { GrupoPendencias } from "@/components/GrupoPendencias";
import { ItemPendencia } from "@/components/ItemPendencia";
import { agrupar } from "@/lib/agrupar";
import { camposDaPendencia } from "@/lib/campos";
import { listarClientes, listarPendencias, usuarioAtual } from "@/lib/dados";
import { CAMPOS, QUEM_ABA, ordenarPendencias } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Pendências" };

type Busca = { quem?: string; prioridade?: string; status?: string; cliente?: string; campo?: string; agrupar?: string };

const ABAS = [
  { valor: "voce", nome: QUEM_ABA.voce },
  { valor: "eu", nome: QUEM_ABA.eu },
  { valor: "bloq", nome: QUEM_ABA.bloq },
  { valor: "todas", nome: "Todas" },
] as const;
type ValorAba = (typeof ABAS)[number]["valor"];

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
  // Sem filtro na URL, a página abre nas pendências que dependem do dono
  const quem: ValorAba = ABAS.find((a) => a.valor === busca.quem)?.valor ?? "voce";
  const [usuario, clientes, todas] = await Promise.all([usuarioAtual(), listarClientes(), listarPendencias()]);
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const cliente = clientes.find((c) => c.slug === busca.cliente);
  const campo = CAMPOS.find((c) => c.chave === busca.campo);

  // Tudo menos a aba: assim os números das abas batem com a lista de cada uma
  const base = todas.filter((p) => {
    if (busca.prioridade && p.prioridade !== busca.prioridade) return false;
    if (status === "abertas" && !(p.status === "aberta" || p.status === "aprovada")) return false;
    if (status !== "abertas" && status !== "todas" && p.status !== status) return false;
    if (busca.cliente === "todos" && p.cliente_id) return false;
    if (cliente && p.cliente_id !== cliente.id) return false;
    if (campo && !camposDaPendencia(p).includes(campo.chave)) return false;
    return true;
  });
  const contagem: Record<ValorAba, number> = {
    voce: base.filter((p) => p.quem === "voce").length,
    eu: base.filter((p) => p.quem === "eu").length,
    bloq: base.filter((p) => p.quem === "bloq").length,
    todas: base.length,
  };
  const filtradas = ordenarPendencias(base.filter((p) => quem === "todas" || p.quem === quem));
  // Pendências iguais viram um card só; "agrupar=0" na URL mostra cada uma separada
  const agruparIguais = busca.agrupar !== "0";
  const entradas = agruparIguais ? agrupar(filtradas) : filtradas.map((p) => ({ tipo: "item" as const, p }));
  const grupos = entradas.filter((e) => e.tipo === "grupo").length;
  const clientesPorId = Object.fromEntries(clientes.map((c) => [c.id, { slug: c.slug, nome: c.nome }]));

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

      <nav aria-label="Quem resolve" className="abas abas-pendencias">
        {ABAS.map((a) => (
          <Link key={a.valor} href={href({ quem: a.valor })} aria-current={quem === a.valor ? "page" : undefined}>
            {a.nome} <span className="aba-n">({contagem[a.valor]})</span>
          </Link>
        ))}
      </nav>

      <div className="filtros">
        {campo && (
          <div className="filtro">
            <p className="filtro-nome" id="f-campo">
              Campo do perfil
            </p>
            <ul aria-labelledby="f-campo">
              <li>
                <Link href={href({ campo: "" })} className="chip" aria-current="true">
                  {campo.nome} ×<span className="sr-only">, tirar este filtro</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
        <div className="filtro">
          <p className="filtro-nome" id="f-agrupar">
            Pendências iguais
          </p>
          <ul aria-labelledby="f-agrupar">
            <li>
              <Link href={href({ agrupar: "" })} className="chip" aria-current={agruparIguais ? "true" : undefined}>
                Agrupar
              </Link>
            </li>
            <li>
              <Link href={href({ agrupar: "0" })} className="chip" aria-current={!agruparIguais ? "true" : undefined}>
                Mostrar separadas
              </Link>
            </li>
          </ul>
        </div>
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
        {grupos > 0 && `, em ${entradas.length} cards (${grupos} ${grupos === 1 ? "grupo" : "grupos"} de pendências iguais)`}
      </p>
      {filtradas.length === 0 ? (
        <p className="vazio">Nenhuma pendência com esses filtros. Troque a aba, a situação ou o cliente para ver mais.</p>
      ) : (
        <ul className="lista-pend lista-larga">
          {entradas.map((e) =>
            e.tipo === "grupo" ? (
              <GrupoPendencias key={e.chave} titulo={e.titulo} itens={e.itens} clientes={clientesPorId} podeEditar={podeEditar} />
            ) : (
              <ItemPendencia key={e.p.id} p={e.p} cliente={e.p.cliente_id ? porId.get(e.p.cliente_id) : undefined} podeEditar={podeEditar} />
            ),
          )}
        </ul>
      )}
    </>
  );
}
