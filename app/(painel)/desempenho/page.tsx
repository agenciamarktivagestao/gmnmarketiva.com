import Link from "next/link";
import type { Metadata } from "next";
import { ResumoDesempenho } from "@/components/ResumoDesempenho";
import type { ItemDoResumo } from "@/components/ResumoDesempenho";
import { Tendencia } from "@/components/Tendencia";
import { Variacao } from "@/components/Variacao";
import { contarConferencia } from "@/lib/conferencia";
import { listarClientes, listarDesempenho, listarEventosDesde, listarReputacao } from "@/lib/dados";
import {
  DIAS_DA_JANELA,
  agruparPorDia,
  comparar,
  diaCompleto,
  diaCurto,
  janelasPossiveis,
  linhaDoCliente,
  numeroBR,
  podeComparar,
  reputacaoMaisRecente,
  serieDiaria,
  somarDiasNaData,
  somarTotais,
  ultimoDiaComDado,
  variacao,
} from "@/lib/desempenho";
import type { DiaDesempenho, DiaDoCliente, LinhaDesempenho } from "@/lib/desempenho";
import { TIPOS_INTERNOS, diaChave, inicioDaBusca } from "@/lib/semana";

export const metadata: Metadata = { title: "Desempenho" };

const DIAS_DO_TRACO = 28;
const HISTORICO_BUSCADO_EM_DIAS = 70; // dá para comparar até 28 dias contra 28 dias e ainda sobra margem
const nota = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const plural = (n: number, um: string, varios: string) => `${numeroBR(n)} ${n === 1 ? um : varios}`;

type Ordem = "volume" | "queda" | "nome";
const ORDENS: { chave: Ordem; nome: string }[] = [
  { chave: "volume", nome: "Mais aparições" },
  { chave: "queda", nome: "Maiores quedas" },
  { chave: "nome", nome: "Ordem alfabética" },
];

export default async function Desempenho({ searchParams }: { searchParams: Promise<{ ordem?: string; janela?: string }> }) {
  const busca = await searchParams;
  const agora = new Date();
  const hoje = diaChave(agora);
  const [clientes, dias, reputacao, eventos] = await Promise.all([
    listarClientes(),
    listarDesempenho(somarDiasNaData(hoje, -HISTORICO_BUSCADO_EM_DIAS)),
    listarReputacao(somarDiasNaData(hoje, -45)),
    listarEventosDesde(inicioDaBusca(agora, 35)),
  ]);

  const ate = ultimoDiaComDado(dias);
  if (ate === null) {
    return (
      <>
        <section className="abertura">
          <h1>Desempenho dos perfis</h1>
          <p className="lead">Como cada perfil apareceu no Google e o que as pessoas fizeram depois.</p>
        </section>
        <p className="vazio">
          Ainda não há números. A rotina da madrugada grava, todo dia, os números que o Google informa de cada perfil. Assim que o primeiro chegar, ele aparece aqui.
        </p>
      </>
    );
  }

  const possiveis = janelasPossiveis(dias);
  const pedida = Number(busca.janela);
  const n = possiveis.includes(pedida) ? pedida : possiveis.includes(DIAS_DA_JANELA) ? DIAS_DA_JANELA : (possiveis[0] ?? DIAS_DA_JANELA);
  const ordem: Ordem = ORDENS.some((o) => o.chave === busca.ordem) ? (busca.ordem as Ordem) : "volume";
  const hrefDaTela = (q: { ordem?: Ordem; janela?: number }) => {
    const p = new URLSearchParams();
    if ((q.ordem ?? ordem) !== "volume") p.set("ordem", q.ordem ?? ordem);
    if ((q.janela ?? n) !== DIAS_DA_JANELA) p.set("janela", String(q.janela ?? n));
    const texto = p.toString();
    return texto ? `/desempenho?${texto}` : "/desempenho";
  };

  const porCliente = new Map<string, DiaDesempenho[]>();
  for (const d of dias as DiaDoCliente[]) porCliente.set(d.cliente_id, [...(porCliente.get(d.cliente_id) ?? []), d]);
  const linhas = clientes.map((c) => ({ c, l: linhaDoCliente(c.id, porCliente.get(c.id) ?? [], ate, n) }));
  const comparaveis = linhas.filter((x) => podeComparar(x.l.comparacao));

  // A soma só entra com quem tem as duas janelas completas: senão a variação compararia coisas diferentes
  const diasDosComparaveis = comparaveis.flatMap((x) => porCliente.get(x.c.id) ?? []);
  const somaAtual = somarTotais(comparaveis.map((x) => x.l.comparacao.atual.totais));
  const somaAnterior = somarTotais(comparaveis.map((x) => x.l.comparacao.anterior.totais));
  const primeiroDoTraco = somarDiasNaData(ate, -(DIAS_DO_TRACO - 1));
  const porDiaDaOperacao = agruparPorDia(diasDosComparaveis);
  const traco = (valor: (d: DiaDesempenho) => number) => serieDiaria(porDiaDaOperacao, primeiroDoTraco, ate, valor).map((p) => p.valor);
  const contra = `em relação aos ${n} dias anteriores`;
  const resumo: ItemDoResumo[] = [
    { nome: "Aparições no Google", valor: somaAtual.aparicoes, variacao: variacao(somaAtual.aparicoes, somaAnterior.aparicoes), serie: traco((d) => d.maps_pc + d.busca_pc + d.maps_cel + d.busca_cel), rotuloDaSerie: "Aparições por dia, somando os perfis" },
    { nome: "Ligações", valor: somaAtual.ligacoes, variacao: variacao(somaAtual.ligacoes, somaAnterior.ligacoes), serie: traco((d) => d.ligacoes), rotuloDaSerie: "Ligações por dia, somando os perfis" },
    { nome: "Pedidos de rota", valor: somaAtual.rotas, variacao: variacao(somaAtual.rotas, somaAnterior.rotas), serie: traco((d) => d.rotas), rotuloDaSerie: "Pedidos de rota por dia, somando os perfis" },
    { nome: "Cliques no site", valor: somaAtual.cliques_site, variacao: variacao(somaAtual.cliques_site, somaAnterior.cliques_site), serie: traco((d) => d.cliques_site), rotuloDaSerie: "Cliques no site por dia, somando os perfis" },
  ];
  const janelaAtual = comparar(porDiaDaOperacao, ate, n);

  // O trabalho feito nos mesmos dias, para ler o resultado ao lado do que fizemos
  const acoesNaJanela = (de: string, fim: string) =>
    eventos.filter((e) => {
      const d = diaChave(e.ocorreu_em);
      return d >= de && d <= fim && e.ok && !TIPOS_INTERNOS.includes(e.tipo);
    });
  const acoesAtuais = acoesNaJanela(janelaAtual.atual.de, janelaAtual.atual.ate);
  const acoesAnteriores = acoesNaJanela(janelaAtual.anterior.de, janelaAtual.anterior.ate);
  const conferidas = contarConferencia(acoesAtuais).conferidas;

  const ultimas = reputacaoMaisRecente(reputacao);
  const nomeDe = (a: { c: { nome: string } }, b: { c: { nome: string } }) => a.c.nome.localeCompare(b.c.nome, "pt-BR");
  const comNumero = (x: { l: LinhaDesempenho }) => !x.l.semDados;
  const ordenadas = [...linhas].sort((a, b) => {
    if (comNumero(a) !== comNumero(b)) return comNumero(a) ? -1 : 1; // quem não tem número vai para o fim
    if (ordem === "nome") return nomeDe(a, b);
    if (ordem === "queda") {
      const da = a.l.aparicoes?.delta;
      const db = b.l.aparicoes?.delta;
      if ((da === undefined) !== (db === undefined)) return da === undefined ? 1 : -1;
      return (da ?? 0) - (db ?? 0) || nomeDe(a, b);
    }
    return b.l.comparacao.atual.totais.aparicoes - a.l.comparacao.atual.totais.aparicoes || nomeDe(a, b);
  });

  return (
    <>
      <section className="abertura">
        <h1>Desempenho dos perfis</h1>
        <p className="lead">
          Como cada perfil apareceu no Google e o que as pessoas fizeram depois. O Google fecha cada dia com cerca de 3 dias de atraso: o último dia com número é {diaCompleto(ate)}.
        </p>
        <p className="nota desempenho-nota">
          O Google não informa em que posição o perfil aparece na busca. Aqui acompanhamos o que ele informa: quantas vezes o perfil apareceu, quantas pessoas ligaram, pediram rota ou abriram o site, e quais buscas levaram até ele (na página de cada cliente).
        </p>
      </section>

      {possiveis.length > 1 && (
        <nav className="desempenho-filtro" aria-label="Período de comparação">
          <span>Comparar os últimos</span>
          <ul className="chips">
            {possiveis.map((p) => (
              <li key={p}>
                <Link href={hrefDaTela({ janela: p })} className="chip" aria-current={p === n ? "true" : undefined}>
                  {p} dias
                </Link>
              </li>
            ))}
          </ul>
          <span>com os dias anteriores</span>
        </nav>
      )}

      {comparaveis.length === 0 ? (
        <p className="vazio">
          Ainda não há {n * 2} dias seguidos de números para comparar o período atual com o anterior. Enquanto isso, a lista abaixo mostra os números de cada perfil.
        </p>
      ) : (
        <section aria-labelledby="t-resumo" className="semana-bloco">
          <h2 id="t-resumo" className="sr-only">
            Resumo de todos os perfis
          </h2>
          <ResumoDesempenho itens={resumo} contra={contra} rotulo={`Resumo dos últimos ${n} dias, somando ${comparaveis.length} perfis`} />
          <p className="dica-secao">
            De {diaCurto(janelaAtual.atual.de)} a {diaCurto(janelaAtual.atual.ate)}, comparado com {diaCurto(janelaAtual.anterior.de)} a {diaCurto(janelaAtual.anterior.ate)}. Soma de{" "}
            {plural(comparaveis.length, "perfil", "perfis")} com números nos dois períodos. O traço mostra os últimos {DIAS_DO_TRACO} dias.
          </p>
          <p className="desempenho-trabalho">
            {acoesAtuais.length === 0 && acoesAnteriores.length === 0 ? (
              <>Nenhuma ação nos perfis foi registrada nesses dias. </>
            ) : (
              <>
                Nos mesmos {n} dias, a rotina e a equipe fizeram <strong>{plural(acoesAtuais.length, "ação", "ações")}</strong> nos perfis
                {acoesAtuais.length > 0 && <> ({numeroBR(conferidas)} já {conferidas === 1 ? "conferida" : "conferidas"} no Google)</>}. No período anterior,{" "}
                {numeroBR(acoesAnteriores.length)}.{" "}
              </>
            )}
            <Link className="link-secao" href="/semana">
              Ver o que foi feito
            </Link>
          </p>
        </section>
      )}

      <section aria-labelledby="t-clientes" className="semana-bloco">
        <div className="secao-topo">
          <h2 id="t-clientes">Cada cliente</h2>
          <ul className="chips" aria-label="Ordem da lista">
            {ORDENS.map((o) => (
              <li key={o.chave}>
                <Link href={hrefDaTela({ ordem: o.chave })} className="chip" aria-current={o.chave === ordem ? "true" : undefined}>
                  {o.nome}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="dica-secao">
          Contatos são as ligações, os pedidos de rota, os cliques no site e as reservas. Toque num cliente para ver o gráfico dia a dia, as buscas que levaram até ele e o que fizemos no perfil.
        </p>
        <ul className="desempenho-clientes">
          {ordenadas.map(({ c, l }) => {
            const rep = ultimas.get(c.id);
            const totais = l.comparacao.atual.totais;
            const serie = serieDiaria(porCliente.get(c.id) ?? [], primeiroDoTraco, ate, (d) => d.maps_pc + d.busca_pc + d.maps_cel + d.busca_cel).map((p) => p.valor);
            return (
              <li key={c.id}>
                <Link href={`/clientes/${c.slug}/desempenho`} className="desempenho-linha">
                  <span className="desempenho-nome">
                    {c.nome}
                    {rep && rep.nota !== null && (
                      <span className="desempenho-reputacao">
                        {nota.format(rep.nota)} de 5 · {plural(rep.total_avaliacoes ?? 0, "avaliação", "avaliações")}
                      </span>
                    )}
                  </span>
                  {l.semDados ? (
                    <span className="desempenho-sem-dados">Ainda sem números deste perfil.</span>
                  ) : (
                    <>
                      <span className="desempenho-numero">
                        <span>
                          <strong>{numeroBR(totais.aparicoes)}</strong> aparições
                        </span>
                        <Variacao v={l.aparicoes} contra={contra} />
                      </span>
                      <span className="desempenho-numero">
                        <span>
                          <strong>{numeroBR(totais.contatos)}</strong> contatos
                        </span>
                        <Variacao v={l.contatos} contra={contra} />
                      </span>
                      <span className="desempenho-traco">
                        <Tendencia valores={serie} rotulo={`Aparições por dia de ${c.nome}, nos últimos ${DIAS_DO_TRACO} dias`} />
                      </span>
                      {l.incompleta && <span className="desempenho-aviso">Faltam dias de números neste período.</span>}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <details className="nova matriz-caixa">
        <summary>Ver a tabela com todos os números</summary>
        <div className="desempenho-tabela-rolagem">
          <table className="desempenho-tabela">
            <caption className="sr-only">
              Números de cada perfil nos últimos {n} dias ({diaCurto(janelaAtual.atual.de)} a {diaCurto(janelaAtual.atual.ate)}) e aparições nos {n} dias anteriores
            </caption>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Aparições</th>
                <th scope="col">Aparições nos {n} dias anteriores</th>
                <th scope="col">Ligações</th>
                <th scope="col">Pedidos de rota</th>
                <th scope="col">Cliques no site</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map(({ c, l }) => (
                <tr key={c.id}>
                  <th scope="row">{c.nome}</th>
                  {l.semDados ? (
                    <td colSpan={5}>Sem números deste perfil.</td>
                  ) : (
                    <>
                      <td>{numeroBR(l.comparacao.atual.totais.aparicoes)}</td>
                      <td>{l.comparacao.anterior.completa ? numeroBR(l.comparacao.anterior.totais.aparicoes) : "sem dados"}</td>
                      <td>{numeroBR(l.comparacao.atual.totais.ligacoes)}</td>
                      <td>{numeroBR(l.comparacao.atual.totais.rotas)}</td>
                      <td>{numeroBR(l.comparacao.atual.totais.cliques_site)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
