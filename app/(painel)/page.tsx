import Link from "next/link";
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
} from "@/lib/dados";
import { camposDaPendencia } from "@/lib/campos";
import { PRIORIDADE, dataCurta, estaAberta, ordenarPendencias } from "@/lib/rotulos";
import { SECOES, secaoDe } from "@/lib/secoes";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function Painel({ searchParams }: { searchParams: Promise<{ ordem?: string; problema?: string }> }) {
  const busca = await searchParams;
  const ordenarPorAbertas = busca.ordem === "abertas";
  const soProblema = busca.problema === "1";
  const [clientes, diagnosticos, pendencias, conteudos, midias, servicos, diretrizes] = await Promise.all([
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
  // Contadores zerados não aparecem: só entra o que precisa de você
  const resumoVisivel = resumo.filter((r) => r.n > 0);
  const hrefPainel = (mudar: { ordem?: string; problema?: string }) => {
    const novo = { ordem: busca.ordem, problema: busca.problema, ...mudar };
    const q = new URLSearchParams();
    Object.entries(novo).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };
  const abertas = pendencias.filter(estaAberta);
  const esperam = pendencias.filter((p) => p.quem === "voce" && p.status === "aberta");
  const altasEsperam = esperam.filter((p) => p.prioridade === "alta").length;
  // O resto das abertas não precisa de você agora
  const aprovadas = abertas.filter((p) => p.status === "aprovada").length;
  const rotinaFaz = abertas.filter((p) => p.status === "aberta" && p.quem === "eu").length;
  const bloqueadas = abertas.filter((p) => p.status === "aberta" && p.quem === "bloq").length;
  const outras = [
    aprovadas > 0 && `${plural(aprovadas, "já aprovada aguarda", "já aprovadas aguardam")} a rotina`,
    rotinaFaz > 0 && `${plural(rotinaFaz, "a rotina faz sozinha", "a rotina faz sozinhas")}`,
    bloqueadas > 0 && `${plural(bloqueadas, "depende", "dependem")} de Chrome ou de plano pago`,
  ].filter((t): t is string => !!t);
  const fila = ordenarPendencias(esperam).slice(0, 6);
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const nomeDaParte = new Map<string, string>(SECOES.map((x) => [x.chave, x.nome]));
  const leitura = [...diagnosticos.values()].map((d) => d.lido_em).sort().at(-1);

  return (
    <>
      <section className="abertura">
        <h1>
          {esperam.length === 0
            ? "Nada espera a sua decisão"
            : `${plural(esperam.length, "decisão espera", "decisões esperam")} por você`}
        </h1>
        <p className="lead">
          {esperam.length > 0 && altasEsperam > 0 && `Destas, ${plural(altasEsperam, "é de prioridade alta", "são de prioridade alta")}. `}
          {outras.length > 0
            ? `Outras ${abertas.length - esperam.length} não precisam de você agora: ${outras.join("; ")}.`
            : esperam.length === 0
              ? "A rotina segue com o que já foi aprovado."
              : ""}
        </p>
        {esperam.length > 0 && (
          <p className="abertura-acoes">
            <Link className="btn btn-primario" href="/pendencias/triagem?quem=voce">
              Decidir uma por vez
            </Link>
            <Link className="link-secao" href="/pendencias?quem=voce">
              Ver a lista das {esperam.length}
            </Link>
          </p>
        )}
      </section>

      {resumoVisivel.length > 0 && (
        <ul className="resumo" aria-label="Outras coisas que esperam por você">
          {resumoVisivel.map((r) => {
            const texto = (
              <>
                <strong>{r.n}</strong>
                <span>{r.n === 1 ? r.um : r.varios}</span>
              </>
            );
            return (
              <li key={r.um}>
                {r.href ? (
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
      )}

      <div className="painel-grade">
        <section aria-labelledby="t-matriz">
          <div className="secao-topo">
            <h2 id="t-matriz">Situação de cada perfil</h2>
            <Link href={hrefPainel({ problema: soProblema ? undefined : "1" })} className="chip" aria-current={soProblema ? "true" : undefined}>
              Só com problema
            </Link>
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
          <p className="dica-secao">
            Clique numa bolinha para abrir essa parte do perfil do cliente.
            {leitura && ` Leitura de ${dataCurta(`${leitura}T12:00:00Z`)}, com dados dos últimos 30 dias.`}
          </p>
          <Matriz
            clientes={clientes}
            diagnosticos={diagnosticos}
            pendencias={pendencias}
            soProblema={soProblema}
            ordenarPorAbertas={ordenarPorAbertas}
            hrefOrdem={hrefPainel({ ordem: ordenarPorAbertas ? undefined : "abertas" })}
          />
        </section>

        {fila.length > 0 && (
          <aside aria-labelledby="t-fila" className="fila">
            <div className="secao-topo">
              <h2 id="t-fila">Primeiras da fila</h2>
            </div>
            <ul className="fila-lista">
              {fila.map((p) => {
                const cliente = p.cliente_id ? porId.get(p.cliente_id) : undefined;
                const parte = secaoDe(p, camposDaPendencia(p));
                // Com cliente, abre a parte do perfil onde a pendência está; sem cliente, a lista das gerais
                const destino = cliente ? `/clientes/${cliente.slug}#parte-${parte}` : "/pendencias?quem=voce&cliente=todos";
                return (
                  <li key={p.id} className={`fila-item pend-${p.prioridade}`}>
                    <Link href={destino}>
                      <span className="fila-onde">
                        <span>{cliente ? cliente.nome : "Todos os perfis"}</span>
                        {cliente && <span className="fila-parte">{nomeDaParte.get(parte) ?? "Outras"}</span>}
                      </span>
                      <span className="fila-titulo">
                        {p.titulo}
                        <span className="sr-only">. Prioridade {PRIORIDADE[p.prioridade].toLowerCase()}.</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {esperam.length > fila.length && (
              <p className="fila-resto">
                <Link href="/pendencias?quem=voce" className="link-secao">
                  Mais {esperam.length - fila.length} na lista
                </Link>
              </p>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
