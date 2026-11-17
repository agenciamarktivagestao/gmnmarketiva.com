import Link from "next/link";
import { ItemPendencia } from "@/components/ItemPendencia";
import { Matriz } from "@/components/Matriz";
import { Fase } from "@/components/Fase";
import {
  listarClientes,
  listarConteudos,
  listarDiagnosticos,
  listarDiretrizes,
  listarMidias,
  listarPendencias,
  listarServicos,
  usuarioAtual,
} from "@/lib/dados";
import { dataCurta, ordenarPendencias } from "@/lib/rotulos";

export default async function Painel() {
  const [usuario, clientes, diagnosticos, pendencias, conteudos, midias, servicos, diretrizes] = await Promise.all([
    usuarioAtual(),
    listarClientes(),
    listarDiagnosticos(),
    listarPendencias(),
    listarConteudos(),
    listarMidias(),
    listarServicos(),
    listarDiretrizes(),
  ]);
  const textosEsperam = conteudos.filter((c) => c.status === "rascunho").length;
  const imagensNaFila = midias.filter((m) => m.status === "na_fila").length;
  const servicosEsperam = servicos.filter((s) => s.status === "sugerido").length;
  const tonsParaRever = diretrizes.filter((d) => d.cliente_id && !d.revisado).length;
  // Serviços e imagens são por cliente: o atalho leva ao cliente que tem mais itens esperando
  const maisFrequente = (ids: string[]) => {
    const contagem = new Map<string, number>();
    ids.forEach((id) => contagem.set(id, (contagem.get(id) ?? 0) + 1));
    const [id] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return clientes.find((c) => c.id === id);
  };
  const clienteServicos = maisFrequente(servicos.filter((s) => s.status === "sugerido").map((s) => s.cliente_id));
  const clienteImagens = maisFrequente(midias.filter((m) => m.status === "na_fila").map((m) => m.cliente_id));
  const resumo = [
    { href: "/conteudo?situacao=rascunho", n: textosEsperam, um: "texto espera aprovação", varios: "textos esperam aprovação" },
    {
      href: clienteServicos ? `/clientes/${clienteServicos.slug}/servicos` : "",
      n: servicosEsperam,
      um: "serviço sugerido espera decisão",
      varios: "serviços sugeridos esperam decisão",
    },
    {
      href: clienteImagens ? `/clientes/${clienteImagens.slug}/imagens` : "",
      n: imagensNaFila,
      um: "imagem na fila para o Google",
      varios: "imagens na fila para o Google",
    },
    { href: "/diretrizes", n: tonsParaRever, um: "tom de cliente para revisar", varios: "tons de clientes para revisar" },
  ];
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

      <ul className="resumo" aria-label="O que mais espera por você">
        {resumo.map((r) => {
          const texto = (
            <>
              <strong>{r.n}</strong>
              <span>{r.n === 1 ? r.um : r.varios}</span>
            </>
          );
          return (
            <li key={r.um}>
              {r.n > 0 && r.href ? (
                <Link href={r.href} className="resumo-item resumo-ativo">
                  {texto}
                </Link>
              ) : (
                <p className="resumo-item">{texto}</p>
              )}
            </li>
          );
        })}
      </ul>

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
