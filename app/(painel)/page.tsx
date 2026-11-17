import Link from "next/link";
import { Fase } from "@/components/Fase";
import { Matriz } from "@/components/Matriz";
import {
  listarClientes,
  listarConteudos,
  listarDiagnosticos,
  listarDiretrizes,
  listarMidias,
  listarPendencias,
  listarServicos,
} from "@/lib/dados";
import { CAMPOS, dataCurta, estaAberta } from "@/lib/rotulos";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function Painel({ searchParams }: { searchParams: Promise<{ ordem?: string }> }) {
  const busca = await searchParams;
  const porNome = busca.ordem === "nome";
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
  const geraisEsperam = esperam.filter((p) => !p.cliente_id);
  const leitura = [...diagnosticos.values()].map((d) => d.lido_em).sort().at(-1);

  // Uma linha por cliente: quantas decisões esperam e o que falta no perfil, em palavras
  const linhas = clientes.map((c) => {
    const campos = CAMPOS.flatMap((x) => {
      const k = diagnosticos.get(c.id)?.campos?.[x.chave];
      return k ? [{ nome: x.nome, nivel: k.nivel }] : [];
    });
    const minhas = esperam.filter((p) => p.cliente_id === c.id);
    return {
      c,
      lido: campos.length > 0,
      falta: campos.filter((x) => x.nivel === "falta").map((x) => x.nome),
      rever: campos.filter((x) => x.nivel === "rever").map((x) => x.nome),
      esperam: minhas.length,
      altas: minhas.filter((p) => p.prioridade === "alta").length,
    };
  });
  const nome = (a: { c: { nome: string } }, b: { c: { nome: string } }) => a.c.nome.localeCompare(b.c.nome, "pt-BR");
  linhas.sort(porNome ? nome : (a, b) => b.esperam - a.esperam || b.altas - a.altas || b.falta.length - a.falta.length || nome(a, b));
  const clientesNaOrdem = linhas.map((l) => l.c);
  const href = (ordem?: string) => (ordem ? `/?ordem=${ordem}` : "/");

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
        <p className="tambem-esperam">
          <span>Também esperam você:</span>
          {resumoVisivel.map((r) => {
            const texto = `${r.n} ${r.n === 1 ? r.um : r.varios}`;
            return r.href ? (
              <Link key={r.um} href={r.href}>
                {texto}
              </Link>
            ) : (
              <span key={r.um}>{texto}</span>
            );
          })}
        </p>
      )}

      <section aria-labelledby="t-clientes">
        <div className="secao-topo">
          <h2 id="t-clientes">Seus clientes</h2>
          <Link href={href(porNome ? undefined : "nome")} className="chip" aria-current={porNome ? "true" : undefined}>
            Ordem alfabética
          </Link>
        </div>
        <p className="dica-secao">
          {porNome ? "Em ordem alfabética." : "Primeiro os que têm mais decisões esperando."} Toque num cliente para ver o perfil dele e decidir ali.
          {leitura && ` Leitura de ${dataCurta(`${leitura}T12:00:00Z`)}, com dados dos últimos 30 dias.`}
        </p>
        <ul className="clientes-lista">
          {geraisEsperam.length > 0 && (
            <li>
              <Link href="/pendencias?quem=voce&cliente=todos" className="cliente-linha">
                <span className="cliente-nome">Pendências gerais</span>
                <span className="cliente-falta">Valem para todos os perfis, não para um só.</span>
                <span className="cliente-conta">
                  <strong>{geraisEsperam.length}</strong>
                  <span>{geraisEsperam.length === 1 ? "decisão" : "decisões"}</span>
                </span>
              </Link>
            </li>
          )}
          {linhas.map((l) => (
            <li key={l.c.id}>
              <Link href={`/clientes/${l.c.slug}`} className="cliente-linha">
                <span className="cliente-nome">{l.c.nome}</span>
                <span className="cliente-falta">
                  {!l.lido ? (
                    "A rotina ainda não leu este perfil."
                  ) : l.falta.length === 0 && l.rever.length === 0 ? (
                    "Tudo em ordem."
                  ) : (
                    <>
                      {l.falta.length > 0 && (
                        <span>
                          <Fase nivel="falta" /> <strong>Falta:</strong> {l.falta.join(", ")}.
                        </span>
                      )}
                      {l.rever.length > 0 && (
                        <span>
                          <Fase nivel="rever" /> <strong>A rever:</strong> {l.rever.join(", ")}.
                        </span>
                      )}
                    </>
                  )}
                </span>
                <span className={`cliente-conta${l.esperam === 0 ? " cliente-conta-zero" : ""}`}>
                  {l.esperam === 0 ? (
                    <span>Nada espera</span>
                  ) : (
                    <>
                      <strong>{l.esperam}</strong>
                      <span>{l.esperam === 1 ? "decisão" : "decisões"}</span>
                      {l.altas > 0 && <span className="cliente-altas">{l.altas === 1 ? "1 alta" : `${l.altas} altas`}</span>}
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <details className="nova matriz-caixa">
        <summary>Comparar todos os perfis numa tabela</summary>
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
        <Matriz clientes={clientesNaOrdem} diagnosticos={diagnosticos} pendencias={pendencias} soProblema={false} ordenarPorAbertas={false} />
      </details>
    </>
  );
}
