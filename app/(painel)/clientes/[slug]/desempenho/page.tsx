import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BarrasRanking } from "@/components/BarrasRanking";
import { CartaoDoPainel } from "@/components/CartaoDoPainel";
import { GraficoDiario } from "@/components/GraficoDiario";
import type { MarcaDoGrafico, PontoDoGrafico } from "@/components/GraficoDiario";
import { ResumoDesempenho } from "@/components/ResumoDesempenho";
import type { ItemDoResumo } from "@/components/ResumoDesempenho";
import { Rosca } from "@/components/Rosca";
import { listarClientes, listarDesempenho, listarEventosDesde, listarReputacao, listarTermos } from "@/lib/dados";
import {
  DIAS_DA_JANELA,
  aparicoesDoDia,
  comparar,
  contarAcoes,
  diaCompleto,
  diaCurto,
  diaPorExtenso,
  marcasDasAcoes,
  mediaMovel,
  mesPorExtenso,
  numeroBR,
  podeComparar,
  porCemAparicoes,
  projetar,
  reputacaoMaisRecente,
  resumirTermos,
  serieDiaria,
  somar,
  somarDiasNaData,
  ultimoDiaComDado,
  variacao,
} from "@/lib/desempenho";
import type { DiaDesempenho } from "@/lib/desempenho";
import { TIPO_EVENTO } from "@/lib/rotulos";
import { GRUPOS, diaChave, grupoDoTipo, inicioDaBusca } from "@/lib/semana";

export const metadata: Metadata = { title: "Desempenho" };

const DIAS_NO_GRAFICO = 90;
const DIAS_DO_TRACO = 28;
const TERMOS_NA_LISTA = 8;
const DIAS_DO_TRABALHO = 28;
const por100 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nota = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const plural = (n: number, um: string, varios: string) => `${numeroBR(n)} ${n === 1 ? um : varios}`;
const tiposEmTexto = (tipos: string[]) => tipos.map((t) => TIPO_EVENTO[t] ?? t).join(", ");

export default async function DesempenhoDoCliente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agora = new Date();
  const hoje = diaChave(agora);
  const clientes = await listarClientes();
  const cliente = clientes.find((c) => c.slug === slug);
  if (!cliente) notFound();

  const [dias, termos, reputacao, eventos] = await Promise.all([
    listarDesempenho(somarDiasNaData(hoje, -DIAS_NO_GRAFICO), cliente.id),
    listarTermos(cliente.id),
    listarReputacao(somarDiasNaData(hoje, -45)),
    listarEventosDesde(inicioDaBusca(agora, DIAS_NO_GRAFICO)),
  ]);

  const ate = ultimoDiaComDado(dias);
  if (ate === null) {
    return (
      <p className="vazio">
        Ainda não há números do Google para este perfil. A rotina grava os números de todo perfil que o Windsor libera; quando este chegar, o gráfico aparece aqui.
      </p>
    );
  }

  const de = dias.reduce((m, d) => (d.dia < m ? d.dia : m), ate);
  const contra = `em relação aos ${DIAS_DA_JANELA} dias anteriores`;
  const comparacao = comparar(dias, ate);
  const comparavel = podeComparar(comparacao);
  const atual = comparacao.atual.totais;
  const anterior = comparacao.anterior.totais;
  const primeiroDoTraco = somarDiasNaData(ate, -(DIAS_DO_TRACO - 1));
  const traco = (valor: (d: DiaDesempenho) => number) => serieDiaria(dias, primeiroDoTraco, ate, valor).map((p) => p.valor);
  const item = (nome: string, v: number, antes: number, valor: (d: DiaDesempenho) => number, unidade: string): ItemDoResumo => ({
    nome,
    valor: v,
    variacao: comparavel ? variacao(v, antes) : null,
    serie: traco(valor),
    rotuloDaSerie: `${nome} por dia, nos últimos ${DIAS_DO_TRACO} dias`,
    projecao: projetar(dias, ate, valor),
    unidade,
  });
  const rep = reputacaoMaisRecente(reputacao).get(cliente.id);
  const resumo: ItemDoResumo[] = [
    item("Aparições no Google", atual.aparicoes, anterior.aparicoes, aparicoesDoDia, "aparições"),
    item("Ligações", atual.ligacoes, anterior.ligacoes, (d) => d.ligacoes, "ligações"),
    item("Pedidos de rota", atual.rotas, anterior.rotas, (d) => d.rotas, "pedidos de rota"),
    item("Cliques no site", atual.cliques_site, anterior.cliques_site, (d) => d.cliques_site, "cliques no site"),
  ];
  if (rep && rep.nota !== null) {
    resumo.push({
      nome: "Nota no Google",
      valor: `${nota.format(rep.nota)} de 5`,
      detalhe: (
        <>
          {plural(rep.total_avaliacoes ?? 0, "avaliação", "avaliações")}
          <span className="desempenho-resumo-leitura"> · lida em {diaCompleto(rep.dia)}</span>
        </>
      ),
    });
  }

  // Gráfico: um ponto por dia, a média dos 7 dias e os dias em que agimos no perfil
  const serie = serieDiaria(dias, de, ate, aparicoesDoDia);
  const medias = mediaMovel(serie);
  const pontos: PontoDoGrafico[] = serie.map((p, i) => ({ dia: p.dia, curto: diaCurto(p.dia), longo: diaPorExtenso(p.dia), valor: p.valor, media: medias[i] }));
  const marcasTodas = marcasDasAcoes(
    eventos.filter((e) => e.cliente_id === cliente.id),
    diaChave,
  );
  const textoDaMarca = (m: (typeof marcasTodas)[number]) => `${plural(m.n, "ação", "ações")}: ${tiposEmTexto(m.tipos)}`;
  const marcasNoGrafico: MarcaDoGrafico[] = marcasTodas.filter((m) => m.dia >= de && m.dia <= ate).map((m) => ({ dia: m.dia, texto: textoDaMarca(m) }));

  const todos = somar(dias);
  const taxa = porCemAparicoes(todos);
  const termosDoMes = resumirTermos(termos);
  const primeiroDoTrabalho = somarDiasNaData(hoje, -(DIAS_DO_TRABALHO - 1));
  const acoesPorGrupo = contarAcoes(eventos.filter((e) => e.cliente_id === cliente.id), primeiroDoTrabalho, hoje, diaChave, grupoDoTipo);
  const trabalho = GRUPOS.map((g) => ({ nome: g.nome, n: acoesPorGrupo.get(g.chave) ?? 0 }))
    .filter((g) => g.n > 0)
    .sort((x, y) => y.n - x.n);
  const totalDeAcoes = trabalho.reduce((t, g) => t + g.n, 0);
  const periodo = `${diaCurto(de)} a ${diaCurto(ate)}`;
  const diasDaTabela = [...pontos].reverse();
  const porDia = new Map(dias.map((d) => [d.dia, d]));

  const soma = (...n: number[]) => n.reduce((t, x) => t + x, 0);
  const periodoDoTrabalho = `${diaCurto(primeiroDoTrabalho)} a ${diaCurto(hoje)}`;

  return (
    <>
      <p className="dica-secao semana-intro">
        Como o perfil de {cliente.nome} apareceu e foi usado no Google, de {diaCompleto(de)} a {diaCompleto(ate)}. O Google fecha cada dia com cerca de 3 dias de atraso.
      </p>

      <ResumoDesempenho itens={resumo} contra={contra} rotulo={`Resumo dos últimos ${DIAS_DA_JANELA} dias de ${cliente.nome}`} />
      <p className="dica-secao desempenho-legenda-resumo">
        {comparavel
          ? `De ${diaCurto(comparacao.atual.de)} a ${diaCurto(comparacao.atual.ate)}, comparado com ${diaCurto(comparacao.anterior.de)} a ${diaCurto(comparacao.anterior.ate)}. O traço mostra os últimos ${DIAS_DO_TRACO} dias.`
          : `De ${diaCurto(comparacao.atual.de)} a ${diaCurto(comparacao.atual.ate)}. Ainda não há ${DIAS_DA_JANELA} dias anteriores completos para comparar.`}{" "}
        A estimativa para os próximos 30 dias supõe que o ritmo dos últimos 14 dias continue: é uma referência, não uma garantia.
      </p>

      <div className="dash-grade">
        <CartaoDoPainel
          id="t-diario"
          titulo="Aparições por dia"
          colunas={8}
          dica="Quantas vezes o perfil apareceu na Busca e no Maps a cada dia. Um dia isolado varia muito: leia a tendência pela média dos últimos 7 dias."
        >
          <GraficoDiario
            pontos={pontos}
            marcas={marcasNoGrafico}
            unidade={{ um: "aparição", varios: "aparições" }}
            descricao={`Aparições de ${cliente.nome} no Google por dia, de ${periodo}, com a média dos últimos 7 dias${marcasNoGrafico.length > 0 ? " e os dias em que agimos no perfil" : ""}.`}
          />
          {marcasNoGrafico.length > 0 && (
            <p className="dash-dica">
              Os losangos pretos mostram quando agimos no perfil. O Google leva alguns dias para refletir uma mudança, e o marcador mostra quando agimos, não prova que a ação causou a variação.
            </p>
          )}
        </CartaoDoPainel>

        <div className="dash-c4 dash-pilha">
          <CartaoDoPainel id="t-onde" titulo="Onde o perfil apareceu" dica={`De ${periodo}.`}>
            <Rosca
              rotulo={`Onde o perfil de ${cliente.nome} apareceu, de ${periodo}`}
              unidade="aparições"
              fatias={[
                { nome: "Busca do Google", n: soma(todos.busca_cel, todos.busca_pc) },
                { nome: "Google Maps", n: soma(todos.maps_cel, todos.maps_pc) },
              ]}
            />
          </CartaoDoPainel>
          <CartaoDoPainel id="t-aparelho" titulo="Em que aparelho" dica={`De ${periodo}.`}>
            <Rosca
              rotulo={`Em que aparelho as pessoas viram o perfil de ${cliente.nome}, de ${periodo}`}
              unidade="aparições"
              fatias={[
                { nome: "Celular", n: soma(todos.busca_cel, todos.maps_cel) },
                { nome: "Computador", n: soma(todos.busca_pc, todos.maps_pc) },
              ]}
            />
          </CartaoDoPainel>
        </div>

        <CartaoDoPainel id="t-taxa" titulo="O que as pessoas fizeram depois de ver o perfil" colunas={4} dica={`Para cada 100 aparições, de ${periodo}.`}>
          {taxa ? (
            <BarrasRanking
              itens={[
                { nome: "Ligaram", n: taxa.ligacoes },
                { nome: "Pediram rota", n: taxa.rotas },
                { nome: "Abriram o site", n: taxa.cliques_site },
              ]}
              unidade="para cada 100 aparições"
              formato={(n) => por100.format(n)}
              rotulo={`O que as pessoas fizeram para cada 100 aparições do perfil de ${cliente.nome}`}
            />
          ) : (
            <p className="vazio">Ainda há poucas aparições (menos de 100) para falar em proporção.</p>
          )}
        </CartaoDoPainel>

        <CartaoDoPainel id="t-buscas" titulo="O que buscaram para chegar até o perfil" colunas={4}>
          {termosDoMes === null ? (
            <p className="vazio">Ainda não há buscas registradas para este perfil. O Google informa os termos por mês fechado.</p>
          ) : (
            <>
              <p className="dash-dica">
                {mesPorExtenso(termosDoMes.mes).replace(/^./, (c) => c.toUpperCase())}. Pessoas diferentes que usaram o termo no mês; o Google não detalha termos usados por poucas pessoas.
              </p>
              {termosDoMes.comNumero.length > 0 ? (
                <BarrasRanking
                  itens={termosDoMes.comNumero.slice(0, TERMOS_NA_LISTA).map((t) => ({ nome: t.termo, n: t.usuarios }))}
                  unidade="pessoas"
                  rotulo={`Termos mais buscados para chegar ao perfil de ${cliente.nome}`}
                />
              ) : (
                <p className="vazio">Nenhum termo chegou ao mínimo que o Google informa em número.</p>
              )}
              {termosDoMes.comNumero.length > TERMOS_NA_LISTA && (
                <p className="dash-dica">
                  Mostrando os {TERMOS_NA_LISTA} mais buscados de {termosDoMes.comNumero.length} termos com número.
                </p>
              )}
              {termosDoMes.abaixoDoLimite > 0 && (
                <details className="desempenho-poucos">
                  <summary>
                    Mais {plural(termosDoMes.abaixoDoLimite, "termo", "termos")} com menos de {termosDoMes.limite ?? 15} pessoas cada
                  </summary>
                  <ul>
                    {termosDoMes.poucos.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </CartaoDoPainel>

        <CartaoDoPainel id="t-acoes" titulo="O que fizemos no perfil" colunas={4} dica={`De ${periodoDoTrabalho}: ${plural(totalDeAcoes, "ação", "ações")}.`}>
          {trabalho.length === 0 ? (
            <p className="vazio">Nenhuma ação no perfil registrada neste período.</p>
          ) : (
            <BarrasRanking itens={trabalho} unidade="ações" rotulo={`Ações no perfil de ${cliente.nome}, de ${periodoDoTrabalho}`} />
          )}
          {marcasTodas.length > 0 && (
            <details className="desempenho-poucos">
              <summary>Ver as ações dia a dia</summary>
              <ul className="desempenho-acoes">
                {[...marcasTodas].reverse().map((m) => (
                  <li key={m.dia}>
                    <strong>{diaCurto(m.dia)}</strong> <span>{textoDaMarca(m)}</span>
                    {m.dia > ate && <span className="desempenho-aviso"> ainda sem número do Google</span>}
                  </li>
                ))}
              </ul>
              <p className="dash-dica">
                O detalhe de cada ação está em{" "}
                <Link className="link-secao" href={`/clientes/${cliente.slug}/semana`}>
                  Últimos 7 dias
                </Link>
                .
              </p>
            </details>
          )}
        </CartaoDoPainel>

        <CartaoDoPainel id="t-ranking" titulo="Posição no Google Maps" colunas={12}>
          <p className="dash-vazio-ranking">
            Aqui entra em que posição o perfil aparece quando alguém busca, em Londrina, Cambé e Ibiporã, e se está subindo ou caindo. O Google não informa isso: é preciso uma ferramenta de rastreio de posição,
            que ainda não está ligada ao painel.
          </p>
        </CartaoDoPainel>
      </div>

      <details className="nova matriz-caixa">
        <summary>Ver os números dia a dia</summary>
        <div className="desempenho-tabela-rolagem">
          <table className="desempenho-tabela">
            <caption className="sr-only">Números de {cliente.nome} por dia, do mais recente para o mais antigo</caption>
            <thead>
              <tr>
                <th scope="col">Dia</th>
                <th scope="col">Aparições</th>
                <th scope="col">Média dos 7 dias</th>
                <th scope="col">Ligações</th>
                <th scope="col">Pedidos de rota</th>
                <th scope="col">Cliques no site</th>
              </tr>
            </thead>
            <tbody>
              {diasDaTabela.map((p) => {
                const d = porDia.get(p.dia);
                return (
                  <tr key={p.dia}>
                    <th scope="row">{diaCompleto(p.dia)}</th>
                    {d ? (
                      <>
                        <td>{numeroBR(aparicoesDoDia(d))}</td>
                        <td>{p.media === null ? "–" : numeroBR(Math.round(p.media * 10) / 10)}</td>
                        <td>{numeroBR(d.ligacoes)}</td>
                        <td>{numeroBR(d.rotas)}</td>
                        <td>{numeroBR(d.cliques_site)}</td>
                      </>
                    ) : (
                      <td colSpan={5}>sem número neste dia</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
