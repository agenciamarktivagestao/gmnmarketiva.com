import { FaixaSemana } from "@/components/FaixaSemana";
import { Logo } from "@/components/Logo";
import { TIPO_EVENTO, dataCurta, hora } from "@/lib/rotulos";
import { contarPorGrupo, periodoEmTexto } from "@/lib/semana";
import type { Semana } from "@/lib/semana";
import type { Cliente, Diagnostico } from "@/lib/tipos";

const numero = (n: number) => n.toLocaleString("pt-BR");
const plural = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`;
// Como cada tipo de ação aparece para o cliente, no singular e no plural (cada linha do histórico é uma ação, não um item)
const TIPO_PARA_CLIENTE: Record<string, [string, string]> = {
  fotos: ["envio de fotos", "envios de fotos"],
  servicos: ["atualização de serviços", "atualizações de serviços"],
  postagens: ["postagem", "postagens"],
  respostas: ["resposta a avaliação", "respostas a avaliações"],
  perfil: ["ajuste nos dados do perfil", "ajustes nos dados do perfil"],
  decisoes: ["conferência do perfil", "conferências do perfil"],
};
const primeiraMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// A folha que vai para o cliente. A semana recebida já vem só com o que deu certo (ver paraOCliente).
export function Relatorio({
  cliente,
  semana,
  diagnostico,
  geradoEm,
}: {
  cliente: Cliente;
  semana: Semana;
  diagnostico?: Diagnostico;
  geradoEm: Date;
}) {
  const diasComAcao = semana.dias.filter((d) => semana.totalPorDia[d.chave] > 0);
  const porTipo = contarPorGrupo(semana.eventos).filter((g) => g.n > 0);
  const faixa = Object.fromEntries(semana.dias.map((d) => [d.chave, semana.totalPorDia[d.chave]]));

  return (
    <article className="relatorio" aria-labelledby="t-relatorio">
      <header className="relatorio-topo">
        <Logo altura={26} />
        <p>
          Relatório semanal
          <span>{periodoEmTexto(semana.dias)}</span>
        </p>
      </header>

      <div className="relatorio-corpo">
        <h1 id="t-relatorio" className="relatorio-cliente">
          {cliente.nome}
        </h1>
        <p className="relatorio-sub">{[cliente.categoria, cliente.cidade].filter(Boolean).join(", ")}</p>

        <p className="relatorio-lead">
          {semana.total === 0
            ? "Nesta semana não houve ações registradas neste perfil."
            : `Nesta semana, a equipe da Marktiva fez ${plural(semana.total, "ação", "ações")} no perfil de ${cliente.nome} no Google, em ${plural(diasComAcao.length, "dia", "dias")}.`}
        </p>

        {semana.total > 0 && (
          <>
            <section className="relatorio-bloco" aria-labelledby="t-r-tipo">
              <h2 id="t-r-tipo">Em que a equipe trabalhou</h2>
              <ul className="relatorio-tipos">
                {porTipo.map((g) => (
                  <li key={g.chave}>
                    <strong>{g.n}</strong> {TIPO_PARA_CLIENTE[g.chave][g.n === 1 ? 0 : 1]}
                  </li>
                ))}
              </ul>
              <FaixaSemana dias={semana.dias} porDia={faixa} />
            </section>

            <section className="relatorio-bloco" aria-labelledby="t-r-dia">
              <h2 id="t-r-dia">O que foi feito, dia a dia</h2>
              {[...diasComAcao].reverse().map((d) => (
                <div key={d.chave} className="relatorio-dia">
                  <h3>{primeiraMaiuscula(d.longo)}</h3>
                  <ul>
                    {semana.porDia[d.chave].map((e) => (
                      <li key={e.id}>
                        <span className="relatorio-hora">{hora(e.ocorreu_em)}</span>
                        <span>
                          <strong>{e.resumo}</strong>
                          <span className="relatorio-tipo"> ({TIPO_EVENTO[e.tipo] ?? e.tipo})</span>
                          {e.detalhe && <span className="relatorio-detalhe">{e.detalhe}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </>
        )}

        {diagnostico && (
          <section className="relatorio-bloco" aria-labelledby="t-r-desempenho">
            <h2 id="t-r-desempenho">Como o perfil foi no Google, nos últimos 30 dias</h2>
            <dl className="relatorio-numeros">
              <div>
                <dt>Vezes que o perfil apareceu</dt>
                <dd>{numero(diagnostico.impressoes)}</dd>
              </div>
              <div>
                <dt>Ligações</dt>
                <dd>{numero(diagnostico.ligacoes)}</dd>
              </div>
              <div>
                <dt>Pedidos de rota</dt>
                <dd>{numero(diagnostico.rotas)}</dd>
              </div>
              <div>
                <dt>Cliques no site</dt>
                <dd>{numero(diagnostico.cliques_site)}</dd>
              </div>
            </dl>
            <p className="relatorio-nota">Dados do Google, lidos em {dataCurta(diagnostico.lido_em)}.</p>
          </section>
        )}

        <footer className="relatorio-rodape">Preparado pela Agência Marktiva, em {dataCurta(geradoEm.toISOString())}.</footer>
      </div>
    </article>
  );
}
