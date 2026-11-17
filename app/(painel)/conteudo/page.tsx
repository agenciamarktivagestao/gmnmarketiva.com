import Link from "next/link";
import type { Metadata } from "next";
import { FormNovoConteudo } from "@/components/FormNovoConteudo";
import { ItemConteudo } from "@/components/ItemConteudo";
import { listarClientes, listarConteudos, listarDiretrizes, listarMidias, usuarioAtual } from "@/lib/dados";
import type { StatusConteudo } from "@/lib/tipos";

export const metadata: Metadata = { title: "Conteúdo" };

const SITUACOES: { valor: "" | StatusConteudo; nome: string }[] = [
  { valor: "", nome: "Todos" },
  { valor: "rascunho", nome: "Esperam decisão" },
  { valor: "aprovado", nome: "Aprovados" },
  { valor: "publicado", nome: "Publicados" },
  { valor: "recusado", nome: "Recusados" },
];

export default async function PaginaConteudo({ searchParams }: { searchParams: Promise<{ cliente?: string; situacao?: string }> }) {
  const { cliente: slug, situacao } = await searchParams;
  const [usuario, clientes, conteudos, midias, diretrizes] = await Promise.all([
    usuarioAtual(),
    listarClientes(),
    listarConteudos(),
    listarMidias(),
    listarDiretrizes(),
  ]);
  const podeEditar = usuario?.papel === "admin" || usuario?.papel === "editor";
  const filtroCliente = clientes.find((c) => c.slug === slug);
  const filtroSituacao = SITUACOES.find((s) => s.valor && s.valor === situacao)?.valor ?? "";
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const midiaPorId = new Map(midias.map((m) => [m.id, m]));
  const geral = diretrizes.find((d) => d.cliente_id === null);
  const guias = Object.fromEntries(
    clientes.map((c) => {
      const d = diretrizes.find((x) => x.cliente_id === c.id);
      return [c.id, { resposta: d?.exemplo_resposta || geral?.exemplo_resposta || "", postagem: d?.exemplo_postagem || geral?.exemplo_postagem || "" }];
    }),
  );

  const lista = conteudos.filter((c) => (!filtroCliente || c.cliente_id === filtroCliente.id) && (!filtroSituacao || c.status === filtroSituacao));
  const esperam = conteudos.filter((c) => c.status === "rascunho").length;
  const link = (s: string) => {
    const q = new URLSearchParams();
    if (filtroCliente) q.set("cliente", filtroCliente.slug);
    if (s) q.set("situacao", s);
    const t = q.toString();
    return `/conteudo${t ? `?${t}` : ""}`;
  };

  return (
    <>
      <section className="abertura">
        <h1>{esperam === 0 ? "Conteúdo" : `${esperam} ${esperam === 1 ? "texto espera" : "textos esperam"} a sua decisão`}</h1>
        <p className="lead">
          Postagens e respostas a avaliações, do jeito que aparecem no Google. O que você aprova, a rotina publica na próxima rodada. Nos clientes em que a
          rotina só deixa rascunho, o texto fica aqui até você decidir.
        </p>
      </section>

      {podeEditar && clientes.length > 0 && (
        <details className="nova">
          <summary>Escrever uma postagem ou resposta</summary>
          <FormNovoConteudo clientes={clientes} midias={midias} clienteInicial={filtroCliente?.slug} guias={guias} />
        </details>
      )}

      <div className="filtros-conteudo">
        <nav aria-label="Situação" className="chips">
          {SITUACOES.map((s) => (
            <Link key={s.valor} href={link(s.valor)} aria-current={filtroSituacao === s.valor ? "true" : undefined} className="chip">
              {s.nome}
            </Link>
          ))}
        </nav>
        <form method="get" className="filtro-cliente">
          <label htmlFor="f-cliente">Cliente</label>
          <select id="f-cliente" name="cliente" defaultValue={filtroCliente?.slug ?? ""}>
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </select>
          {filtroSituacao && <input type="hidden" name="situacao" value={filtroSituacao} />}
          <button type="submit" className="btn">
            Filtrar
          </button>
        </form>
      </div>

      {lista.length === 0 ? (
        <p className="vazio">
          Nenhum conteúdo{filtroCliente ? ` de ${filtroCliente.nome}` : ""} nesta situação. Quando a rotina escrever em modo rascunho, ou quando você
          escrever aqui, aparece nesta lista com a prévia.
        </p>
      ) : (
        <ul className="conteudos">
          {lista.map((c) => {
            const cliente = porId.get(c.cliente_id);
            if (!cliente) return null;
            return (
              <ItemConteudo key={c.id} c={c} cliente={cliente} imagemUrl={c.midia_id ? midiaPorId.get(c.midia_id)?.url : null} podeEditar={podeEditar} />
            );
          })}
        </ul>
      )}
    </>
  );
}
