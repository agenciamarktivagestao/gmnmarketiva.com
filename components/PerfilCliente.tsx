import Link from "next/link";
import { Fase } from "./Fase";
import { ItemPendencia } from "./ItemPendencia";
import { Estrelas } from "./PreviaGoogle";
import { camposDaPendencia, nomeDoCampo } from "@/lib/campos";
import {
  NOME_LINK,
  capaDe,
  dataBR,
  linkRota,
  linkTelefone,
  notaBR,
  resumoHorario,
  type AvaliacaoPerfil,
  type DadosPerfil,
  type PerfilLido,
} from "@/lib/perfil";
import { NIVEL, TIPO_EVENTO, dataCurta, estaAberta, hora } from "@/lib/rotulos";
import { SECOES, secaoDe, situacaoDaSecao, type ChaveSecao } from "@/lib/secoes";
import type { Cliente, Diagnostico, Evento, Pendencia } from "@/lib/tipos";

const MAX_SERVICOS = 18;
const numero = (n: number) => n.toLocaleString("pt-BR");
const plural = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`;
const inicial = (nome: string) => nome.replace(/[^\p{L}\p{N}]/gu, " ").trim().charAt(0).toUpperCase() || "?";

type Props = {
  cliente: Cliente;
  perfil: PerfilLido | null;
  diagnostico?: Diagnostico;
  pendencias: Pendencia[]; // já em ordem
  eventos: Evento[];
  podeEditar: boolean;
};

export function PerfilCliente({ cliente, perfil, diagnostico, pendencias, eventos, podeEditar }: Props) {
  const dados = perfil?.dados ?? null;
  const porSecao = new Map<ChaveSecao, Pendencia[]>();
  pendencias.forEach((p) => {
    const chave = secaoDe(p, camposDaPendencia(p));
    porSecao.set(chave, [...(porSecao.get(chave) ?? []), p]);
  });
  const abertas = pendencias.filter(estaAberta);
  const partesComPendencia = new Set(abertas.map((p) => secaoDe(p, camposDaPendencia(p)))).size;

  const secoes = [
    ...SECOES.map((s) => ({ ...s, ...situacaoDaSecao(diagnostico?.campos, s.campos, nomeDoCampo), pend: porSecao.get(s.chave) ?? [] })),
    { chave: "outras" as const, nome: "Outras pendências", campos: [], nivel: null, resumo: "", pend: porSecao.get("outras") ?? [] },
  ].filter((s) => s.chave !== "outras" || s.pend.length > 0);

  return (
    <div className="perfil-grade">
      <aside className="perfil-lateral" aria-label="Como o perfil aparece no Google">
        <CartaoGoogle cliente={cliente} dados={dados} />
        {diagnostico && (
          <>
            <h2 className="perfil-sub">Últimos 30 dias</h2>
            <dl className="perfil-numeros">
              <div>
                <dt>Impressões</dt>
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
          </>
        )}
        <p className="perfil-lido">
          {perfil ? (
            <>
              {perfil.demonstracao ? "Dados de exemplo" : `Perfil lido em ${dataCurta(perfil.lido_em)} às ${hora(perfil.lido_em)}`}
              {dados && linkRota(dados) && !perfil.demonstracao && (
                <>
                  {" · "}
                  <a href={linkRota(dados) ?? undefined} target="_blank" rel="noreferrer">
                    Abrir no Google Maps<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </>
              )}
            </>
          ) : (
            "A prévia aparece depois que a rotina ler este perfil."
          )}
        </p>
      </aside>

      <div className="perfil-secoes">
        <p className="perfil-resumo">
          {abertas.length === 0 ? (
            "Nenhuma pendência aberta neste perfil."
          ) : (
            <>
              <strong>{plural(abertas.length, "pendência aberta", "pendências abertas")}</strong>{" "}
              {partesComPendencia === 1 ? "em 1 parte do perfil" : `em ${partesComPendencia} partes do perfil`}. Cada uma está logo abaixo da parte a que se refere.
            </>
          )}
        </p>

        {secoes.map((s) => {
          const abertasDaSecao = s.pend.filter(estaAberta);
          const temAlta = abertasDaSecao.some((p) => p.prioridade === "alta");
          // Aberta quando há o que ver; a conta usa todas as pendências (não só as abertas) para a parte não se fechar sob quem acabou de decidir
          const aberta = s.pend.length > 0 || (s.nivel !== null && s.nivel !== "ok");
          return (
            <details key={s.chave} className="secao-perfil" id={`parte-${s.chave}`} open={aberta}>
              <summary>
                {s.nivel ? <Fase nivel={s.nivel} /> : <span className="fase-vazia" aria-hidden="true" />}
                <h2>{s.nome}</h2>
                {s.resumo && <span className="secao-resumo">{s.resumo}</span>}
                {abertasDaSecao.length > 0 && (
                  <span className={`secao-contagem${temAlta ? " secao-contagem-alta" : ""}`}>
                    {plural(abertasDaSecao.length, "aberta", "abertas")}
                  </span>
                )}
                {s.nivel && <span className="sr-only">{NIVEL[s.nivel]}</span>}
              </summary>
              <div className="secao-conteudo">
                {s.chave !== "outras" && <CorpoDaParte chave={s.chave} dados={dados} slug={cliente.slug} />}
                {s.pend.length > 0 && (
                  <ul className="lista-pend secao-pend">
                    {s.pend.map((p) => (
                      <ItemPendencia key={p.id} p={p} cliente={cliente} podeEditar={podeEditar} mostrarCliente={false} />
                    ))}
                  </ul>
                )}
              </div>
            </details>
          );
        })}

        <details className="secao-perfil secao-historico" id="parte-historico">
          <summary>
            <span className="fase-vazia" aria-hidden="true" />
            <h2>O que a rotina já fez</h2>
            <span className="secao-resumo">{eventos.length === 0 ? "Nada registrado" : plural(eventos.length, "registro", "registros")}</span>
          </summary>
          <div className="secao-conteudo">
            {eventos.length === 0 ? (
              <p className="vazio">Nada registrado para este cliente ainda.</p>
            ) : (
              <ul className="eventos">
                {eventos.map((e) => (
                  <li key={e.id}>
                    <p className="evento-quando">
                      {dataCurta(e.ocorreu_em)} {hora(e.ocorreu_em)}
                    </p>
                    <p>
                      <span className="etiqueta">{TIPO_EVENTO[e.tipo] ?? e.tipo}</span> {e.resumo}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// O cartão que o Google mostra: capa, nome, nota, endereço e botões
// ---------------------------------------------------------------------------
function CartaoGoogle({ cliente, dados }: { cliente: Cliente; dados: DadosPerfil | null }) {
  if (!dados) {
    return (
      <div className="gcartao gcartao-vazio">
        <div className="gcartao-capa gcartao-sem-capa" aria-hidden="true">
          {inicial(cliente.nome)}
        </div>
        <div className="gcartao-corpo">
          <p className="gcartao-titulo">{cliente.nome}</p>
          <p className="gcartao-linha">{[cliente.categoria, cliente.cidade].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
    );
  }
  const titulo = dados.titulo || cliente.nome;
  const capa = capaDe(dados.fotos);
  const ligar = linkTelefone(dados.telefone);
  const rota = linkRota(dados);
  const horario = resumoHorario(dados.horario);
  return (
    <div className="gcartao">
      {capa ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="gcartao-capa" src={capa.url} alt="Capa do perfil" referrerPolicy="no-referrer" />
      ) : (
        <div className="gcartao-capa gcartao-sem-capa" role="img" aria-label="O perfil ainda não tem capa">
          {inicial(titulo)}
        </div>
      )}
      <div className="gcartao-corpo">
        <p className="gcartao-titulo">{titulo}</p>
        <p className="gcartao-nota">
          {dados.nota !== null ? (
            <>
              <strong>{notaBR(dados.nota)}</strong> <Estrelas n={Math.round(dados.nota)} />{" "}
              <span className="gcartao-total">({numero(dados.total_avaliacoes)})</span>
            </>
          ) : (
            <span className="gcartao-total">Sem avaliações</span>
          )}
        </p>
        {(dados.categoria || cliente.cidade) && <p className="gcartao-linha">{[dados.categoria, cliente.cidade].filter(Boolean).join(" · ")}</p>}
        <div className="gcartao-botoes">
          {ligar && (
            <a href={ligar} aria-label={`Ligar para ${dados.telefone}`}>
              Ligar
            </a>
          )}
          {rota && (
            <a href={rota} target="_blank" rel="noreferrer">
              Rota<span className="sr-only"> (abre o Google Maps em nova aba)</span>
            </a>
          )}
          {dados.site && (
            <a href={dados.site} target="_blank" rel="noreferrer">
              Site<span className="sr-only"> (abre em nova aba)</span>
            </a>
          )}
        </div>
        <dl className="gcartao-info">
          {dados.endereco && (
            <div>
              <dt>Endereço</dt>
              <dd>{dados.endereco}</dd>
            </div>
          )}
          {horario.length > 0 && (
            <div>
              <dt>Horário</dt>
              <dd>
                {horario.map((h) => (
                  <span key={h.dias} className="gcartao-hora">
                    {h.dias}: {h.horas}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {dados.telefone && (
            <div>
              <dt>Telefone</dt>
              <dd>{dados.telefone}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// O que cada parte mostra hoje no perfil
// ---------------------------------------------------------------------------
function CorpoDaParte({ chave, dados, slug }: { chave: ChaveSecao; dados: DadosPerfil | null; slug: string }) {
  if (!dados) return null;
  switch (chave) {
    case "fotos":
      return (
        <>
          {dados.fotos.length === 0 ? (
            <p className="perfil-vazio">Nenhuma foto nos últimos {dados.fotos_janela_dias} dias.</p>
          ) : (
            <ul className="perfil-fotos">
              {dados.fotos.map((f) => (
                <li key={f.url} className={f.categoria === "capa" ? "foto-capa" : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.categoria === "capa" ? "Capa do perfil" : "Foto do perfil"} loading="lazy" referrerPolicy="no-referrer" />
                  {f.categoria === "capa" && <span className="foto-rotulo">Capa</span>}
                  {f.categoria === "fachada" && <span className="foto-rotulo">Fachada</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="perfil-nota">
            Aparecem as fotos dos últimos {dados.fotos_janela_dias} dias. <Link href={`/clientes/${slug}/imagens`}>Enviar imagens</Link>
          </p>
        </>
      );
    case "nome":
      return (
        <dl className="perfil-dl">
          <dt>Nome no Google</dt>
          <dd>{dados.titulo || "—"}</dd>
          <dt>Categoria principal</dt>
          <dd>{dados.categoria ?? "—"}</dd>
          <dt>Outras categorias</dt>
          <dd>{dados.categorias_extras.length ? <Chips itens={dados.categorias_extras} /> : "Nenhuma"}</dd>
          <dt>Endereço</dt>
          <dd>{dados.endereco || "—"}</dd>
        </dl>
      );
    case "descricao":
      return dados.descricao ? (
        <>
          <p className="perfil-texto">{dados.descricao}</p>
          <p className="perfil-nota">{numero(dados.descricao.length)} de 750 caracteres</p>
        </>
      ) : (
        <p className="perfil-vazio">O perfil está sem descrição.</p>
      );
    case "servicos": {
      const visiveis = dados.servicos.slice(0, MAX_SERVICOS);
      const restantes = dados.servicos.length - visiveis.length;
      return (
        <>
          {visiveis.length === 0 ? (
            <p className="perfil-vazio">Nenhum serviço cadastrado.</p>
          ) : (
            <Chips itens={visiveis} extra={restantes > 0 ? `e mais ${restantes}` : undefined} />
          )}
          <p className="perfil-nota">
            {plural(dados.servicos.length, "serviço", "serviços")} no perfil. <Link href={`/clientes/${slug}/servicos`}>Gerir serviços</Link>
          </p>
        </>
      );
    }
    case "horario": {
      const horario = resumoHorario(dados.horario);
      return horario.length === 0 ? (
        <p className="perfil-vazio">O perfil está sem horário.</p>
      ) : (
        <dl className="perfil-dl">
          {horario.map((h) => (
            <div key={h.dias} className="perfil-dl-linha">
              <dt>{h.dias}</dt>
              <dd>{h.horas}</dd>
            </div>
          ))}
        </dl>
      );
    }
    case "area":
      return dados.area.length === 0 ? <p className="perfil-vazio">Nenhuma cidade na área de atendimento.</p> : <Chips itens={dados.area} />;
    case "atributos": {
      const links = Object.entries(dados.links);
      return (
        <>
          {dados.atributos.length === 0 ? <p className="perfil-vazio">Nenhum atributo marcado como “sim”.</p> : <Chips itens={dados.atributos} />}
          {links.length > 0 && (
            <p className="perfil-nota">
              Links no perfil:{" "}
              {links.map(([k, url], i) => (
                <span key={k}>
                  {i > 0 && " · "}
                  <a href={url} target="_blank" rel="noreferrer">
                    {NOME_LINK[k] ?? k}
                    <span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </span>
              ))}
            </p>
          )}
        </>
      );
    }
    case "avaliacoes":
      return (
        <>
          <p className="perfil-nota-topo">
            {dados.nota !== null ? (
              <>
                <strong>{notaBR(dados.nota)}</strong> de 5 · {plural(dados.total_avaliacoes, "avaliação", "avaliações")} no total
              </>
            ) : (
              "Ainda sem avaliações."
            )}
          </p>
          {dados.avaliacoes.length === 0 ? (
            <p className="perfil-vazio">Nenhuma avaliação nova nos últimos {dados.avaliacoes_janela_dias} dias.</p>
          ) : (
            <ul className="perfil-avaliacoes">
              {dados.avaliacoes.map((a) => (
                <Avaliacao key={a.id} a={a} />
              ))}
            </ul>
          )}
          <p className="perfil-nota">Aparecem as avaliações dos últimos {dados.avaliacoes_janela_dias} dias.</p>
        </>
      );
    case "posts":
      return dados.posts.length === 0 ? (
        <p className="perfil-vazio">
          Nenhuma postagem nos últimos 30 dias.{" "}
          <Link href={`/conteudo?cliente=${slug}`}>Ver conteúdo</Link>
        </p>
      ) : (
        <ul className="perfil-posts">
          {dados.posts.map((p, i) => (
            <li key={i}>
              <p className="perfil-texto">{p.texto}</p>
              {p.data && <p className="perfil-nota">{dataBR(p.data)}</p>}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

function Chips({ itens, extra }: { itens: string[]; extra?: string }) {
  return (
    <ul className="perfil-chips">
      {itens.map((i) => (
        <li key={i}>{i}</li>
      ))}
      {extra && <li className="perfil-chip-mais">{extra}</li>}
    </ul>
  );
}

function Avaliacao({ a }: { a: AvaliacaoPerfil }) {
  return (
    <li className="aval">
      <p className="aval-topo">
        <span className="aval-autor">{a.autor}</span> <Estrelas n={a.estrelas} />
        {a.data && <span className="aval-data">{dataBR(a.data)}</span>}
      </p>
      {a.texto && <p className="aval-texto">{a.texto}</p>}
      {a.resposta ? (
        <div className="aval-resposta">
          <p className="aval-resposta-topo">
            Resposta do proprietário{a.resposta_em ? ` · ${dataBR(a.resposta_em)}` : ""}
          </p>
          <p className="aval-texto">{a.resposta}</p>
        </div>
      ) : (
        <p className="aval-sem-resposta">
          <span className="etiqueta etiqueta-alta">Sem resposta</span>
        </p>
      )}
    </li>
  );
}
