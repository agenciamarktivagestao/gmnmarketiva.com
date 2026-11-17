"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { comentar, comentarVarias, decidir, decidirVarias } from "@/app/actions";
import { PRIORIDADE, QUEM, dataCurta, hora } from "@/lib/rotulos";
import {
  aprovavelComUmClique,
  formatarTempo,
  mandarParaOFim,
  segundosRestantes,
  tipoDoCartao,
  vizinho,
  type Cartao,
} from "@/lib/triagem";
import type { Pendencia, Prioridade, Status } from "@/lib/tipos";
import { AcoesPendencia } from "./AcoesPendencia";

type ClienteResumo = { slug: string; nome: string };
type Acao = Extract<Status, "aprovada" | "recusada" | "concluida">;
type Registro = { acao: Acao; ids: string[]; titulo: string };
type Aviso = { id: number; tipo: "ok" | "erro" | "info"; texto: string; desfazer?: boolean };

const VERBO: Record<Acao, string> = { aprovada: "Aprovado", recusada: "Recusado", concluida: "Marcado como feito" };
const PESO: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };
const PEDE_RESPOSTA = new Set(["avaliacoes", "choose", "input", "upload"]);

function diasDesde(iso: string) {
  const dias = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));
  return dias === 0 ? "aberta hoje" : dias === 1 ? "aberta há 1 dia" : `aberta há ${dias} dias`;
}

// Campo de texto, lista, menu ou seleção de arquivo: aí as teclas são do usuário, não atalhos
function estaDigitando(alvo: EventTarget | null) {
  const el = alvo as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName === "INPUT") return !["radio", "checkbox", "button", "submit"].includes((el as HTMLInputElement).type);
  return false;
}

// Um card de cada vez: a pendência mais urgente e mais antiga primeiro, com as decisões no teclado ou nos botões.
// Cada decisão é gravada do mesmo jeito que na lista (status e comentário); aqui ela só aparece antes de o servidor responder.
export function Triagem({
  cartoes,
  abertas,
  clientes,
  podeEditar,
  demo,
}: {
  cartoes: Cartao[];
  abertas: Pendencia[];
  clientes: Record<string, ClienteResumo>;
  podeEditar: boolean;
  demo: boolean;
}) {
  // A ordem da fila fica como era na abertura da tela; os dados de cada pendência vêm sempre da página
  const [cartoesIniciais] = useState(cartoes);
  const total = cartoesIniciais.length;
  const idsDe = useMemo(() => new Map(cartoesIniciais.map((c) => [c.chave, c.ids])), [cartoesIniciais]);
  const [ordem, setOrdem] = useState(() => cartoesIniciais.map((c) => c.chave));
  const [atualChave, setAtualChave] = useState<string | null>(cartoesIniciais[0]?.chave ?? null);
  const [resolvidos, setResolvidos] = useState<Record<string, Registro>>({});
  const [pilha, setPilha] = useState<string[]>([]); // decisões que o Z desfaz, a última no fim
  const [reabrindo, setReabrindo] = useState<Set<string>>(new Set());
  const [duracoes, setDuracoes] = useState<number[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [comentando, setComentando] = useState(false);
  const [textoComentario, setTextoComentario] = useState("");
  const [erroComentario, setErroComentario] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const porId = useMemo(() => new Map(abertas.map((p) => [p.id, p])), [abertas]);
  // Último dado visto de cada pendência: enquanto um "desfazer" ainda não voltou do servidor, o card usa este
  const memoria = useRef(new Map<string, Pendencia>());
  abertas.forEach((p) => memoria.current.set(p.id, p));

  const itensDe = (chave: string): Pendencia[] =>
    (idsDe.get(chave) ?? [])
      .map((id) => porId.get(id) ?? (reabrindo.has(chave) ? memoria.current.get(id) : undefined))
      .filter((p): p is Pendencia => !!p)
      .sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || a.criado_em.localeCompare(b.criado_em));
  // Resolvido aqui (decidido pela barra) ou lá (a resposta no card fechou a pendência e ela saiu da lista)
  const pendentes = new Set(ordem.filter((k) => !resolvidos[k] && itensDe(k).length > 0));
  const atual = atualChave && pendentes.has(atualChave) ? atualChave : vizinho(ordem, pendentes, atualChave, 1);
  const itens = atual ? itensDe(atual) : [];
  const tipo = tipoDoCartao(itens);
  const nomeDe = (p: Pendencia) => (p.cliente_id ? clientes[p.cliente_id]?.nome : undefined) ?? "Todos os perfis";

  const feitos = total - pendentes.size;
  const posicao = Math.min(feitos + 1, total);
  const restante = formatarTempo(segundosRestantes(pendentes.size, duracoes));

  // ----- Avisos e leitura em voz alta -----
  const contador = useRef(0);
  const mostrar = (tipoAviso: Aviso["tipo"], texto: string, desfazer = false) => setAviso({ id: ++contador.current, tipo: tipoAviso, texto, desfazer });
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.tipo === "erro" ? 12000 : 8000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Uma pendência que sai da lista sem ter sido decidida na barra foi resolvida pela resposta no card
  const idsAnteriores = useRef(new Set(abertas.map((p) => p.id)));
  useEffect(() => {
    const agora = new Set(abertas.map((p) => p.id));
    const saiu = [...idsAnteriores.current].filter((id) => !agora.has(id));
    idsAnteriores.current = agora;
    const nossos = new Set(Object.values(resolvidos).flatMap((r) => r.ids));
    const deFora = saiu.filter((id) => !nossos.has(id));
    if (deFora.length === 0) return;
    const p = memoria.current.get(deFora[0]);
    mostrar("ok", deFora.length === 1 && p ? `Resposta salva: ${p.titulo} (${nomeDe(p)}).` : `${deFora.length} respostas salvas.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abertas]);

  // Quando o servidor devolve um "desfazer", a pendência volta à lista da página e o card deixa de depender da memória
  useEffect(() => {
    if (reabrindo.size === 0) return;
    const faltam = [...reabrindo].filter((k) => !(idsDe.get(k) ?? []).some((id) => porId.has(id)));
    if (faltam.length !== reabrindo.size) setReabrindo(new Set(faltam));
  }, [porId, reabrindo, idsDe]);

  // Tempo gasto por card resolvido (para a estimativa); uma pausa longa é limitada em lib/triagem
  const anterior = useRef<{ chave: string | null; t: number }>({ chave: null, t: Date.now() });
  const pendentesRef = useRef(pendentes);
  pendentesRef.current = pendentes;
  const cartaoRef = useRef<HTMLElement>(null);
  const primeiro = useRef(true);
  useEffect(() => {
    const agora = Date.now();
    const ant = anterior.current;
    if (ant.chave && ant.chave !== atual && !pendentesRef.current.has(ant.chave)) setDuracoes((d) => [...d, (agora - ant.t) / 1000]);
    if (ant.chave !== atual) anterior.current = { chave: atual, t: agora };
    // Ao mudar de card, o foco vai para ele: leitores de tela anunciam o título e, no celular, a tela volta ao topo do card
    if (primeiro.current) primeiro.current = false;
    else cartaoRef.current?.focus();
  }, [atual]);

  // ----- Decisões -----
  const reverter = (chave: string) => {
    setResolvidos((r) => {
      const { [chave]: _, ...resto } = r;
      return resto;
    });
    setPilha((s) => s.filter((k) => k !== chave));
    setAtualChave(chave);
  };

  const agir = (acao: Acao) => {
    if (!atual || !podeEditar || itens.length === 0) return;
    if (acao === "aprovada" && !aprovavelComUmClique(itens)) {
      mostrar(
        "info",
        tipo === "external"
          ? "Esta pendência só se resolve fora do painel. Depois de resolver, use Marcar como feito."
          : "Esta pendência pede uma resposta. Preencha no card.",
      );
      return;
    }
    const chave = atual;
    const ids = itens.map((p) => p.id);
    const titulo = itens[0].titulo;
    setComentando(false);
    setResolvidos((r) => ({ ...r, [chave]: { acao, ids, titulo } }));
    setPilha((s) => [...s, chave]);
    mostrar("ok", `${VERBO[acao]}: ${titulo} (${ids.length > 1 ? `${ids.length} perfis` : nomeDe(itens[0])}).`, true);
    if (demo) return;
    iniciar(async () => {
      const r = ids.length === 1 ? await decidir(ids[0], acao) : await decidirVarias(ids, acao, "aberta");
      if (r.erro) {
        reverter(chave);
        mostrar("erro", `Não consegui gravar "${titulo}". ${r.erro}`);
      }
    });
  };

  const desfazer = () => {
    const chave = pilha[pilha.length - 1];
    const reg = chave ? resolvidos[chave] : undefined;
    if (!chave || !reg) {
      mostrar("info", "Não há nada para desfazer.");
      return;
    }
    setResolvidos((r) => {
      const { [chave]: _, ...resto } = r;
      return resto;
    });
    setPilha((s) => s.slice(0, -1));
    setReabrindo((s) => new Set(s).add(chave));
    setAtualChave(chave);
    mostrar("info", `Desfeito: ${reg.titulo}.`);
    if (demo) return;
    iniciar(async () => {
      const r = reg.ids.length === 1 ? await decidir(reg.ids[0], "aberta") : await decidirVarias(reg.ids, "aberta", reg.acao);
      if (r.erro) {
        setResolvidos((s) => ({ ...s, [chave]: reg }));
        setPilha((s) => [...s, chave]);
        setReabrindo((s) => {
          const novo = new Set(s);
          novo.delete(chave);
          return novo;
        });
        mostrar("erro", `Não consegui desfazer "${reg.titulo}". ${r.erro}`);
      }
    });
  };

  const andar = (passo: 1 | -1) => {
    const alvo = vizinho(ordem, pendentes, atual, passo);
    if (!alvo || alvo === atual) {
      mostrar("info", "Este é o único card que falta.");
      return;
    }
    setComentando(false);
    setAtualChave(alvo);
  };

  const pular = () => {
    if (!atual) return;
    const alvo = vizinho(ordem, pendentes, atual, 1);
    if (!alvo || alvo === atual) {
      mostrar("info", "Este é o único card que falta. Não há para onde pular.");
      return;
    }
    setComentando(false);
    setOrdem((o) => mandarParaOFim(o, atual));
    setAtualChave(alvo);
    mostrar("info", `Pulado: ${itens[0].titulo}. Volta no fim da fila.`);
  };

  const abrirComentario = () => {
    if (!atual || !podeEditar) return;
    setErroComentario(null);
    setComentando(true);
  };

  const enviarComentario = () => {
    const texto = textoComentario.trim();
    if (!texto || itens.length === 0) return;
    const ids = itens.map((p) => p.id);
    setErroComentario(null);
    if (demo) {
      setComentando(false);
      setTextoComentario("");
      mostrar("info", "Modo demonstração: o comentário não foi salvo.");
      return;
    }
    iniciar(async () => {
      const r = ids.length === 1 ? await comentar(ids[0], texto) : await comentarVarias(ids, texto);
      if (r.erro) setErroComentario(r.erro);
      else {
        setComentando(false);
        setTextoComentario("");
        mostrar("ok", ids.length > 1 ? `Comentário enviado para os ${ids.length} perfis.` : "Comentário enviado.");
        cartaoRef.current?.focus();
      }
    });
  };

  // Teclado: o ouvinte é registrado uma vez e lê sempre as funções mais recentes
  const teclas = useRef<Record<string, () => void>>({});
  useEffect(() => {
    teclas.current = { a: () => agir("aprovada"), r: () => agir("recusada"), f: () => agir("concluida"), c: abrirComentario, s: pular, j: () => andar(1), k: () => andar(-1), z: desfazer };
  });
  useEffect(() => {
    const aoApertar = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || estaDigitando(e.target)) return;
      const acao = teclas.current[e.key.toLowerCase()];
      if (!acao) return;
      e.preventDefault();
      // Segurar a tecla não repete a decisão: cada card pede um toque
      if (!e.repeat) acao();
    };
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, []);

  const campoComentario = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (comentando) campoComentario.current?.focus();
  }, [comentando]);

  // ----- Telas sem card -----
  if (total === 0) {
    return (
      <p className="vazio">
        Nenhuma pendência aberta nesta fila. <Link href="/pendencias">Ver todas as pendências</Link>.
      </p>
    );
  }
  if (!atual) {
    const totalPendencias = Object.values(resolvidos).reduce((n, r) => n + r.ids.length, 0);
    return (
      <section className="triagem-fim" aria-live="polite">
        <h2>Fila concluída</h2>
        <p>
          {feitos} {feitos === 1 ? "card resolvido" : "cards resolvidos"}
          {totalPendencias > 0 && ` nesta tela (${totalPendencias} ${totalPendencias === 1 ? "pendência decidida" : "pendências decididas"} por você)`}.
        </p>
        {pilha.length > 0 && podeEditar && (
          <p>
            Errou a última?{" "}
            <button type="button" className="btn btn-discreto" onClick={desfazer}>
              Desfazer
            </button>
          </p>
        )}
        <p>
          <Link className="btn" href="/pendencias">
            Voltar para a lista de pendências
          </Link>
        </p>
        <Avisos aviso={aviso} onDesfazer={desfazer} />
      </section>
    );
  }

  const grupo = itens.length > 1;
  const prioridade = itens.map((p) => p.prioridade).sort((a, b) => PESO[a] - PESO[b])[0];
  const quem = itens[0].quem;
  const maisAntiga = itens.map((p) => p.criado_em).sort()[0];
  const detalhesIguais = new Set(itens.map((p) => p.detalhe ?? "")).size === 1;
  // O mesmo comentário gravado em todos os perfis do card aparece uma vez só
  const comentariosAnteriores = (() => {
    const mapa = new Map<string, { id: string; autor: string; texto: string; criado_em: string; perfis: string[] }>();
    itens.forEach((p) =>
      p.comentarios.forEach((c) => {
        const chave = `${c.autor}|${c.texto}|${c.criado_em.slice(0, 16)}`;
        const e = mapa.get(chave) ?? { id: c.id, autor: c.autor, texto: c.texto, criado_em: c.criado_em, perfis: [] };
        e.perfis.push(nomeDe(p));
        mapa.set(chave, e);
      }),
    );
    return [...mapa.values()].sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  })();
  const quemComentou = (perfis: string[]) => (!grupo ? "" : perfis.length === itens.length ? " (todos os perfis)" : perfis.length > 2 ? ` (${perfis.length} perfis)` : ` (${perfis.join(", ")})`);
  const rotulo = (itens[0].payload as { rotulo?: string } | null)?.rotulo ?? "Aprovar";
  const unicoCliente = !grupo && itens[0].cliente_id ? clientes[itens[0].cliente_id] : undefined;
  const respostaNoCard = PEDE_RESPOSTA.has(tipo);
  // Só os nomes cabem em uma linha; com resposta, ação ou detalhe próprio, cada perfil ganha o seu bloco
  const empilhar = respostaNoCard || tipo === "external" || !detalhesIguais;

  return (
    <div className="triagem">
      {demo && (
        <p className="aviso">Modo demonstração: as decisões valem só nesta tela e não são salvas. Atualize a página para começar de novo.</p>
      )}

      <div className="triagem-progresso">
        <p className="triagem-posicao">
          <strong>
            {posicao} de {total}
          </strong>
          <span>
            {feitos} {feitos === 1 ? "resolvido" : "resolvidos"}, {restante} para terminar
          </span>
        </p>
        <div className="triagem-trilha" role="progressbar" aria-label="Progresso da triagem" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitos} aria-valuetext={`${feitos} de ${total} cards resolvidos`}>
          <span style={{ width: `${Math.round((feitos / total) * 100)}%` }} />
        </div>
        <div className="triagem-nav">
          <button type="button" className="btn btn-discreto" onClick={() => andar(-1)} aria-keyshortcuts="K">
            ‹ Anterior <kbd>K</kbd>
          </button>
          <button type="button" className="btn btn-discreto" onClick={() => andar(1)} aria-keyshortcuts="J">
            Próximo › <kbd>J</kbd>
          </button>
          {podeEditar && (
            <button type="button" className="btn btn-discreto" onClick={desfazer} disabled={pilha.length === 0} aria-keyshortcuts="Z">
              Desfazer <kbd>Z</kbd>
            </button>
          )}
          <span className="triagem-salvando" aria-live="polite">
            {salvando ? "Salvando…" : ""}
          </span>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Card {posicao} de {total}: {itens[0].titulo}
      </p>

      <article ref={cartaoRef} tabIndex={-1} className={`triagem-card pend-${prioridade}`} aria-labelledby="triagem-titulo" aria-busy={salvando}>
        <header className="triagem-topo">
          <p className="pend-cliente">
            {grupo ? <span className="grupo-n-perfis">{itens.length} perfis</span> : unicoCliente ? <Link href={`/clientes/${unicoCliente.slug}`}>{unicoCliente.nome}</Link> : "Todos os perfis"}
          </p>
          <h2 id="triagem-titulo">{itens[0].titulo}</h2>
          <p className="triagem-meta">
            <span className={prioridade === "alta" ? "etiqueta etiqueta-alta" : prioridade === "media" ? "etiqueta etiqueta-media" : "etiqueta"}>Prioridade {PRIORIDADE[prioridade].toLowerCase()}</span>
            <span suppressHydrationWarning>{diasDesde(maisAntiga)}</span>
            {quem !== "voce" && <span className="etiqueta">{QUEM[quem]}</span>}
          </p>
        </header>

        {!grupo && itens[0].detalhe && <p className="pend-detalhe">{itens[0].detalhe}</p>}
        {grupo && detalhesIguais && itens[0].detalhe && <p className="pend-detalhe">{itens[0].detalhe}</p>}

        {grupo && (
          <ul className={empilhar ? "triagem-perfis triagem-perfis-empilhados" : "triagem-perfis"} aria-label={`Os ${itens.length} perfis deste card`}>
            {itens.map((p) => {
              const cli = p.cliente_id ? clientes[p.cliente_id] : undefined;
              return (
                <li key={p.id} className={empilhar ? "triagem-perfil triagem-perfil-bloco" : "triagem-perfil"}>
                  <p className="grupo-cliente">{cli ? <Link href={`/clientes/${cli.slug}`}>{cli.nome}</Link> : "Todos os perfis"}</p>
                  {!detalhesIguais && p.detalhe && <p className="pend-detalhe">{p.detalhe}</p>}
                  {respostaNoCard || tipo === "external" ? <AcoesPendencia p={p} podeEditar={podeEditar} triagem /> : null}
                </li>
              );
            })}
          </ul>
        )}

        {!grupo && (respostaNoCard || tipo === "external") && <AcoesPendencia p={itens[0]} podeEditar={podeEditar} triagem />}

        {comentariosAnteriores.length > 0 && (
          <div className="triagem-comentarios">
            <p className="triagem-comentarios-titulo">Comentários anteriores</p>
            <ul>
              {comentariosAnteriores.slice(-3).map((c) => (
                <li key={c.id}>
                  <p className="comentario-autor">
                    {c.autor.split("@")[0]}
                    {quemComentou(c.perfis)}, {dataCurta(c.criado_em)} {hora(c.criado_em)}
                  </p>
                  <p>{c.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {comentando && (
          <form
            className="triagem-comentar"
            onSubmit={(e) => {
              e.preventDefault();
              enviarComentario();
            }}
          >
            <label htmlFor="triagem-comentario">{grupo ? `Comentário (vale para os ${itens.length} perfis)` : "Comentário"}</label>
            <textarea
              id="triagem-comentario"
              ref={campoComentario}
              rows={3}
              maxLength={2000}
              value={textoComentario}
              placeholder="Diga o que fazer ou o que mudou. A rotina lê isto na próxima rodada."
              onChange={(e) => setTextoComentario(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setComentando(false);
                  cartaoRef.current?.focus();
                }
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  enviarComentario();
                }
              }}
            />
            <div className="triagem-comentar-botoes">
              <button type="submit" className="btn btn-primario" disabled={salvando || !textoComentario.trim()}>
                Enviar comentário
              </button>
              <button
                type="button"
                className="btn btn-discreto"
                onClick={() => {
                  setComentando(false);
                  cartaoRef.current?.focus();
                }}
              >
                Cancelar <kbd>Esc</kbd>
              </button>
            </div>
            {erroComentario && (
              <p role="alert" className="erro">
                {erroComentario}
              </p>
            )}
          </form>
        )}
      </article>

      <div className="triagem-barra" role="group" aria-label="Decidir este card">
        <Avisos aviso={aviso} onDesfazer={desfazer} />
        {podeEditar ? (
          <>
            {tipo === "approve" && (
              <button type="button" className="btn btn-primario triagem-principal" onClick={() => agir("aprovada")} aria-keyshortcuts="A">
                {grupo ? `${rotulo}: todos (${itens.length})` : rotulo} <kbd>A</kbd>
              </button>
            )}
            {tipo === "external" && (
              <button type="button" className="btn btn-primario triagem-principal" onClick={() => agir("concluida")} aria-keyshortcuts="F">
                {grupo ? `Marcar todos como feito (${itens.length})` : "Marcar como feito"} <kbd>F</kbd>
              </button>
            )}
            {respostaNoCard && <p className="triagem-dica">Responda no card: este tipo não se aprova com um toque.</p>}
            <div className="triagem-sec">
              <button type="button" className="btn" onClick={() => agir("recusada")} aria-keyshortcuts="R">
                Recusar <kbd>R</kbd>
              </button>
              {tipo !== "external" && (
                <button type="button" className="btn" onClick={() => agir("concluida")} aria-keyshortcuts="F">
                  Feito <kbd>F</kbd>
                </button>
              )}
              <button type="button" className="btn" onClick={abrirComentario} aria-keyshortcuts="C" aria-expanded={comentando}>
                Comentar <kbd>C</kbd>
              </button>
              <button type="button" className="btn" onClick={pular} aria-keyshortcuts="S">
                Pular <kbd>S</kbd>
              </button>
            </div>
          </>
        ) : (
          <p className="triagem-dica">Seu acesso é só de leitura: você pode passar pelos cards, mas não decidir.</p>
        )}
      </div>

      <details className="triagem-atalhos">
        <summary>Atalhos do teclado</summary>
        <dl>
          <dt>
            <kbd>A</kbd>
          </dt>
          <dd>Aprovar (só aprovação simples; grupos aprovam todos os perfis)</dd>
          <dt>
            <kbd>R</kbd>
          </dt>
          <dd>Recusar</dd>
          <dt>
            <kbd>F</kbd>
          </dt>
          <dd>Marcar como feito</dd>
          <dt>
            <kbd>C</kbd>
          </dt>
          <dd>Comentar (Ctrl+Enter envia, Esc cancela)</dd>
          <dt>
            <kbd>S</kbd>
          </dt>
          <dd>Pular: o card vai para o fim da fila</dd>
          <dt>
            <kbd>J</kbd> / <kbd>K</kbd>
          </dt>
          <dd>Próximo card / card anterior</dd>
          <dt>
            <kbd>Z</kbd>
          </dt>
          <dd>Desfazer a última decisão</dd>
        </dl>
      </details>
    </div>
  );
}

function Avisos({ aviso, onDesfazer }: { aviso: Aviso | null; onDesfazer: () => void }) {
  return (
    <div className="triagem-aviso-area" role={aviso?.tipo === "erro" ? "alert" : "status"} aria-live={aviso?.tipo === "erro" ? "assertive" : "polite"}>
      {aviso && (
        <p className={`triagem-aviso triagem-aviso-${aviso.tipo}`}>
          <span>{aviso.texto}</span>
          {aviso.desfazer && (
            <button type="button" className="btn btn-discreto" onClick={onDesfazer}>
              Desfazer
            </button>
          )}
        </p>
      )}
    </div>
  );
}
