import Link from "next/link";
import type { Metadata } from "next";
import { BarrasRanking } from "@/components/BarrasRanking";
import { BarrasVariacao } from "@/components/BarrasVariacao";
import { CartaoDoPainel } from "@/components/CartaoDoPainel";
import { GraficoDiario } from "@/components/GraficoDiario";
import type { MarcaDoGrafico, PontoDoGrafico } from "@/components/GraficoDiario";
import { MapaDeCalor } from "@/components/MapaDeCalor";
import { ResumoDesempenho } from "@/components/ResumoDesempenho";
import type { ItemDoResumo } from "@/components/ResumoDesempenho";
import { Rosca } from "@/components/Rosca";
import { Tendencia } from "@/components/Tendencia";
import { Variacao } from "@/components/Variacao";
import { contarConferencia } from "@/lib/conferencia";
import { listarClientes, listarDesempenho, listarEventosDesde, listarReputacao } from "@/lib/dados";
import {
  DIAS_DA_JANELA,
  agruparPorDia,
  aparicoesDoDia,
  comparar,
  contarAcoes,
  diaCompleto,
  diaCurto,
  diaPorExtenso,
  janelasPossiveis,
  linhaDoCliente,
  marcasDasAcoes,
  mediaMovel,
  numeroBR,
  podeComparar,
  projetar,
  reputacaoMaisRecente,
  semanasDosDias,
  serieDiaria,
  somar,
  somarDiasNaData,
  somarTotais,
  ultimoDiaComDado,
  variacao,
} from "@/lib/desempenho";
import type { DiaDesempenho, DiaDoCliente, LinhaDesempenho } from "@/lib/desempenho";
import { TIPO_EVENTO } from "@/lib/rotulos";
import { GRUPOS, TIPOS_INTERNOS, diaChave, grupoDoTipo, inicioDaBusca } from "@/lib/semana";

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

  const item = (nome: string, atual: number, anterior: number, valor: (d: DiaDesempenho) => number, unidade: string): ItemDoResumo => ({
    nome,
    valor: atual,
    variacao: variacao(atual, anterior),
    serie: traco(valor),
    rotuloDaSerie: `${nome} por dia, somando os perfis`,
    projecao: projetar(porDiaDaOperacao, ate, valor),
    unidade,
  });
  const resumo: ItemDoResumo[] = [
    item("Aparições no Google", somaAtual.aparicoes, somaAnterior.aparicoes, aparicoesDoDia, "aparições"),
    item("Ligações", somaAtual.ligacoes, somaAnterior.ligacoes, (d) => d.ligacoes, "ligações"),
    item("Pedidos de rota", somaAtual.rotas, somaAnterior.rotas, (d) => d.rotas, "pedidos de rota"),
    item("Cliques no site", somaAtual.cliques_site, somaAnterior.cliques_site, (d) => d.cliques_site, "cliques no site"),
    {
      nome: "Ações nos perfis",
      valor: acoesAtuais.length,
      variacao: variacao(acoesAtuais.length, acoesAnteriores.length),
      detalhe: <>{conferidas === acoesAtuais.length ? "todas conferidas no Google" : `${numeroBR(conferidas)} conferidas no Google`}</>,
    },
  ];


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

  // Gráfico do total: um ponto por dia, a média de 7 dias e os dias em que agimos em algum perfil
  const deDoGrafico = porDiaDaOperacao.reduce((m, d) => (d.dia < m ? d.dia : m), ate);
  const serieTotal = serieDiaria(porDiaDaOperacao, deDoGrafico, ate, aparicoesDoDia);
  const mediasTotal = mediaMovel(serieTotal);
  const pontos: PontoDoGrafico[] = serieTotal.map((p, i) => ({ dia: p.dia, curto: diaCurto(p.dia), longo: diaPorExtenso(p.dia), valor: p.valor, media: mediasTotal[i] }));
  const tiposEmTexto = (tipos: string[]) => tipos.map((t) => TIPO_EVENTO[t] ?? t).join(", ");
  const marcas: MarcaDoGrafico[] = marcasDasAcoes(eventos, diaChave)
    .filter((m) => m.dia >= deDoGrafico && m.dia <= ate)
    .map((m) => ({ dia: m.dia, texto: `${plural(m.n, "ação", "ações")}: ${tiposEmTexto(m.tipos)}` }));
  const periodo = `${diaCurto(deDoGrafico)} a ${diaCurto(ate)}`;

  // De onde vêm as aparições (todos os perfis com número, de ponta a ponta)
  const todos = somar(porDiaDaOperacao);
  const soma = (...v: number[]) => v.reduce((t, x) => t + x, 0);

  // Quem mais subiu e quem mais caiu no período
  const comVariacao = comparaveis.flatMap((x) => (x.l.aparicoes ? [{ nome: x.c.nome, href: `/clientes/${x.c.slug}/desempenho`, v: x.l.aparicoes }] : []));
  const subiram = comVariacao.filter((i) => i.v.sentido === "subiu").sort((a, b) => b.v.delta - a.v.delta).slice(0, 5);
  const cairam = comVariacao.filter((i) => i.v.sentido === "caiu").sort((a, b) => a.v.delta - b.v.delta).slice(0, 5);

  // Semana a semana por cliente (mapa de calor)
  const semanasDe = new Map(comparaveis.map((x) => [x.c.id, semanasDosDias(porCliente.get(x.c.id) ?? [], ate, 8)]));
  const colunasDoCalor = [...new Map([...semanasDe.values()].flat().map((s) => [s.de, { de: s.de, ate: s.ate }])).values()].sort((a, b) => a.de.localeCompare(b.de));
  const linhasDoCalor = ordenadas.filter((x) => semanasDe.has(x.c.id)).map((x) => ({ nome: x.c.nome, href: `/clientes/${x.c.slug}/desempenho`, semanas: semanasDe.get(x.c.id) ?? [] }));

  // Participação de cada cliente nas aparições do período
  const porVolume = [...comparaveis].sort((a, b) => b.l.comparacao.atual.totais.aparicoes - a.l.comparacao.atual.totais.aparicoes);
  const totalDaJanela = somaAtual.aparicoes;
  const maiores = porVolume.slice(0, 8).map((x) => ({ nome: x.c.nome, n: x.l.comparacao.atual.totais.aparicoes }));
  const resto = porVolume.slice(8).reduce((t, x) => t + x.l.comparacao.atual.totais.aparicoes, 0);
  const participacao = resto > 0 ? [...maiores, { nome: `Outros ${porVolume.length - 8} perfis`, n: resto }] : maiores;

  // O que foi feito, por tipo, nos mesmos dias
  const porGrupo = contarAcoes(eventos, janelaAtual.atual.de, janelaAtual.atual.ate, diaChave, grupoDoTipo);
  const trabalho = GRUPOS.map((g) => ({ nome: g.nome, n: porGrupo.get(g.chave) ?? 0 }))
    .filter((g) => g.n > 0)
    .sort((x, y) => y.n - x.n);

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
        <>
          <section aria-labelledby="t-resumo" className="semana-bloco">
            <h2 id="t-resumo" className="sr-only">
              Resumo de todos os perfis
            </h2>
            <ResumoDesempenho itens={resumo} contra={contra} rotulo={`Resumo dos últimos ${n} dias, somando ${comparaveis.length} perfis`} />
            <p className="dica-secao">
              De {diaCurto(janelaAtual.atual.de)} a {diaCurto(janelaAtual.atual.ate)}, comparado com {diaCurto(janelaAtual.anterior.de)} a {diaCurto(janelaAtual.anterior.ate)}. Soma de{" "}
              {plural(comparaveis.length, "perfil", "perfis")} com números nos dois períodos. A estimativa para os próximos 30 dias supõe que o ritmo dos últimos 14 dias continue: é uma
              referência, não uma garantia.
            </p>
          </section>

          <div className="dash-grade">
            <CartaoDoPainel
              id="t-total"
              titulo="Aparições por dia, somando os perfis"
              colunas={8}
              dica="Um dia isolado varia muito: leia a tendência pela média dos últimos 7 dias."
            >
              <GraficoDiario
                pontos={pontos}
                marcas={marcas}
                unidade={{ um: "aparição", varios: "aparições" }}
                descricao={`Aparições de todos os perfis no Google por dia, de ${periodo}, com a média dos últimos 7 dias${marcas.length > 0 ? " e os dias em que agimos em algum perfil" : ""}.`}
              />
              {marcas.length > 0 ? (
                <p className="dash-dica">
                  Os losangos pretos mostram os dias em que agimos em algum perfil. O Google leva alguns dias para refletir uma mudança: o marcador mostra quando agimos, não prova que a ação causou a
                  variação.{" "}
                  <Link className="link-secao" href="/semana">
                    Ver o que foi feito
                  </Link>
                </p>
              ) : (
                <p className="dash-dica">Nenhuma ação nos perfis foi registrada neste período.</p>
              )}
            </CartaoDoPainel>

            <div className="dash-c4 dash-pilha">
              <CartaoDoPainel id="t-onde" titulo="Onde os perfis apareceram" dica={`De ${periodo}.`}>
                <Rosca
                  rotulo={`Onde os perfis apareceram, de ${periodo}`}
                  unidade="aparições"
                  fatias={[
                    { nome: "Busca do Google", n: soma(todos.busca_cel, todos.busca_pc) },
                    { nome: "Google Maps", n: soma(todos.maps_cel, todos.maps_pc) },
                  ]}
                />
              </CartaoDoPainel>
              <CartaoDoPainel id="t-aparelho" titulo="Em que aparelho" dica={`De ${periodo}.`}>
                <Rosca
                  rotulo={`Em que aparelho as pessoas viram os perfis, de ${periodo}`}
                  unidade="aparições"
                  fatias={[
                    { nome: "Celular", n: soma(todos.busca_cel, todos.maps_cel) },
                    { nome: "Computador", n: soma(todos.busca_pc, todos.maps_pc) },
                  ]}
                />
              </CartaoDoPainel>
            </div>

            <CartaoDoPainel id="t-subiram" titulo="Quem mais subiu" colunas={6} dica={`Aparições nos últimos ${n} dias, contra os ${n} anteriores.`}>
              {subiram.length === 0 ? (
                <p className="vazio">Nenhum perfil subiu neste período.</p>
              ) : (
                <BarrasVariacao itens={subiram} contra={contra} tom="subiu" rotulo={`Perfis que mais subiram em aparições nos últimos ${n} dias`} />
              )}
            </CartaoDoPainel>
            <CartaoDoPainel id="t-cairam" titulo="Quem mais caiu" colunas={6} dica={`Aparições nos últimos ${n} dias, contra os ${n} anteriores.`}>
              {cairam.length === 0 ? (
                <p className="vazio">Nenhum perfil caiu neste período.</p>
              ) : (
                <BarrasVariacao itens={cairam} contra={contra} tom="caiu" rotulo={`Perfis que mais caíram em aparições nos últimos ${n} dias`} />
              )}
            </CartaoDoPainel>

            {colunasDoCalor.length > 1 && (
              <CartaoDoPainel
                id="t-calor"
                titulo="Semana a semana, cliente por cliente"
                dica="Cada coluna é uma semana de 7 dias. A cor compara a semana com a média do próprio cliente: mostra quem está subindo ou caindo, não quem é maior. O número é o total de aparições."
              >
                <MapaDeCalor colunas={colunasDoCalor} linhas={linhasDoCalor} rotulo="Aparições de cada cliente por semana" />
              </CartaoDoPainel>
            )}

            <CartaoDoPainel id="t-part" titulo="Quem mais aparece" colunas={6} dica={`Aparições nos últimos ${n} dias e a parte de cada perfil no total.`}>
              <BarrasRanking
                itens={participacao}
                unidade="aparições"
                rotulo={`Aparições de cada perfil nos últimos ${n} dias`}
                formato={(v) => `${numeroBR(v)} · ${totalDaJanela > 0 ? Math.round((v / totalDaJanela) * 100) : 0}%`}
              />
            </CartaoDoPainel>
            <CartaoDoPainel id="t-trabalho" titulo="O que fizemos nos perfis" colunas={6} dica={`Nos mesmos ${n} dias: ${plural(acoesAtuais.length, "ação", "ações")}.`}>
              {trabalho.length === 0 ? (
                <p className="vazio">Nenhuma ação nos perfis foi registrada neste período.</p>
              ) : (
                <BarrasRanking itens={trabalho} unidade="ações" rotulo={`Ações nos perfis nos últimos ${n} dias, por tipo`} />
              )}
            </CartaoDoPainel>

            <CartaoDoPainel id="t-ranking" titulo="Posição no Google Maps" colunas={12}>
              <p className="dash-vazio-ranking">
                Aqui entra o ranking de cada empresa na região de Londrina, Cambé e Ibiporã e se ele está subindo ou caindo. O Google não informa a posição: é preciso uma ferramenta de rastreio de posição,
                que ainda não está ligada ao painel.
              </p>
            </CartaoDoPainel>
          </div>
        </>
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
