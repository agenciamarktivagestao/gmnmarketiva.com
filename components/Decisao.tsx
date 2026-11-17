"use client";

import { useId, useState, useTransition } from "react";
import { responder } from "@/app/actions";
import { DIAS, type DiaHorario } from "@/lib/respostas";
import type { DiaSemana, Pendencia, PayloadApprove, PayloadChoose, PayloadExternal, PayloadInput, Status } from "@/lib/tipos";
import { UploadPendencia } from "./UploadPendencia";

// Envia a resposta e guarda o estado de "salvando" e o erro, igual para todos os tipos
function useResponder(id: string) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const enviar = (resposta: Parameters<typeof responder>[1]) =>
    iniciar(async () => {
      setErro(null);
      const r = await responder(id, resposta);
      if (r.erro) setErro(r.erro);
    });
  return { pendente, erro, enviar };
}

function Erro({ texto }: { texto: string | null }) {
  return texto ? (
    <p role="alert" className="erro">
      {texto}
    </p>
  ) : null;
}

// ---------------------------------------------------------------------------
// choose: opções como botões de seleção, mais "Outro"
// ---------------------------------------------------------------------------
function Escolha({ p, payload }: { p: Pendencia; payload: PayloadChoose }) {
  const nome = useId();
  const [valor, setValor] = useState("");
  const [outro, setOutro] = useState("");
  const { pendente, erro, enviar } = useResponder(p.id);
  const opcoes = payload.opcoes ?? [];
  const falta = !valor || (valor === "outro" && !outro.trim());

  return (
    <form
      className="decisao"
      aria-busy={pendente}
      onSubmit={(e) => {
        e.preventDefault();
        if (!falta) enviar({ tipo: "choose", valor, outro });
      }}
    >
      <fieldset className="decisao-grupo">
        <legend>{payload.pergunta ?? "Escolha uma opção"}</legend>
        {opcoes.map((o) => (
          <label key={o.valor} className={valor === o.valor ? "opcao opcao-marcada" : "opcao"}>
            <input type="radio" name={nome} value={o.valor} checked={valor === o.valor} onChange={() => setValor(o.valor)} />
            <span>
              <strong>{o.rotulo}</strong>
              {o.detalhe && <small>{o.detalhe}</small>}
            </span>
          </label>
        ))}
        {payload.permitir_outro && (
          <label className={valor === "outro" ? "opcao opcao-marcada" : "opcao"}>
            <input type="radio" name={nome} value="outro" checked={valor === "outro"} onChange={() => setValor("outro")} />
            <span>
              <strong>Outro</strong>
            </span>
          </label>
        )}
      </fieldset>
      {valor === "outro" && (
        <>
          <label className="sr-only" htmlFor={`${nome}-outro`}>
            Sua resposta
          </label>
          <textarea id={`${nome}-outro`} rows={3} maxLength={500} value={outro} placeholder="Escreva a resposta" onChange={(e) => setOutro(e.target.value)} />
        </>
      )}
      <div>
        <button type="submit" className="btn btn-primario" disabled={pendente || falta}>
          {pendente ? "Salvando…" : "Confirmar escolha"}
        </button>
      </div>
      <Erro texto={erro} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// input: cidades (chips), horário, atributos (lista de marcar) e texto livre
// ---------------------------------------------------------------------------
function Cidades({ p, payload }: { p: Pendencia; payload: PayloadInput }) {
  const id = useId();
  const [cidades, setCidades] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const { pendente, erro, enviar } = useResponder(p.id);

  const juntar = (atuais: string[]) => {
    const novas = texto.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
    return [...new Set([...atuais, ...novas])];
  };
  const adicionar = () => {
    setCidades(juntar(cidades));
    setTexto("");
  };
  const pronto = juntar(cidades);

  return (
    <form
      className="decisao"
      aria-busy={pendente}
      onSubmit={(e) => {
        e.preventDefault();
        if (pronto.length) enviar({ tipo: "input", campo: "cidades", valor: pronto });
      }}
    >
      <label htmlFor={id}>{payload.pergunta ?? "Quais cidades?"}</label>
      <div className="cidades-linha">
        <input
          id={id}
          value={texto}
          maxLength={60}
          placeholder="Digite uma cidade e aperte Enter"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <button type="button" className="btn" onClick={adicionar} disabled={!texto.trim()}>
          Adicionar
        </button>
      </div>
      {cidades.length > 0 && (
        <ul className="cidades" aria-label="Cidades escolhidas">
          {cidades.map((c) => (
            <li key={c}>
              <span>{c}</span>
              <button type="button" aria-label={`Tirar ${c}`} onClick={() => setCidades(cidades.filter((x) => x !== c))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <button type="submit" className="btn btn-primario" disabled={pendente || !pronto.length}>
          {pendente ? "Salvando…" : `Salvar ${pronto.length > 1 ? `${pronto.length} cidades` : "cidade"}`}
        </button>
      </div>
      <Erro texto={erro} />
    </form>
  );
}

type LinhaHorario = { modo: "" | "fechado" | "24h" | "horario"; abre: string; fecha: string };

function Horario({ p, payload }: { p: Pendencia; payload: PayloadInput }) {
  const id = useId();
  const dias = DIAS.filter((d) => !payload.dias?.length || payload.dias.includes(d.chave));
  const [linhas, setLinhas] = useState<Record<string, LinhaHorario>>(() =>
    Object.fromEntries(dias.map((d) => [d.chave, { modo: "", abre: "08:00", fecha: "18:00" } as LinhaHorario])),
  );
  const { pendente, erro, enviar } = useResponder(p.id);
  const mudar = (chave: DiaSemana, parte: Partial<LinhaHorario>) => setLinhas((l) => ({ ...l, [chave]: { ...l[chave], ...parte } }));
  const completo = dias.every((d) => linhas[d.chave].modo !== "");

  const montar = (): Record<string, DiaHorario> =>
    Object.fromEntries(
      dias.map((d) => {
        const l = linhas[d.chave];
        const v: DiaHorario = l.modo === "horario" ? { modo: "horario", abre: l.abre, fecha: l.fecha } : l.modo === "24h" ? { modo: "24h" } : { modo: "fechado" };
        return [d.chave, v];
      }),
    );

  return (
    <form
      className="decisao"
      aria-busy={pendente}
      onSubmit={(e) => {
        e.preventDefault();
        if (completo) enviar({ tipo: "input", campo: "horario", valor: montar() });
      }}
    >
      <fieldset className="decisao-grupo">
        <legend>{payload.pergunta ?? "Qual é o horário de funcionamento?"}</legend>
        {dias.map((d) => {
          const l = linhas[d.chave];
          return (
            <div key={d.chave} className="horario-dia">
              <label htmlFor={`${id}-${d.chave}`}>{d.nome}</label>
              <select id={`${id}-${d.chave}`} value={l.modo} onChange={(e) => mudar(d.chave, { modo: e.target.value as LinhaHorario["modo"] })}>
                <option value="">Escolha…</option>
                <option value="fechado">Fechado</option>
                <option value="horario">Abre em horário</option>
                <option value="24h">Aberto 24 horas</option>
              </select>
              {l.modo === "horario" && (
                <span className="horario-horas">
                  <label className="sr-only" htmlFor={`${id}-${d.chave}-abre`}>
                    {d.nome}: abre às
                  </label>
                  <input id={`${id}-${d.chave}-abre`} type="time" value={l.abre} onChange={(e) => mudar(d.chave, { abre: e.target.value })} />
                  <span aria-hidden="true">às</span>
                  <label className="sr-only" htmlFor={`${id}-${d.chave}-fecha`}>
                    {d.nome}: fecha às
                  </label>
                  <input id={`${id}-${d.chave}-fecha`} type="time" value={l.fecha} onChange={(e) => mudar(d.chave, { fecha: e.target.value })} />
                </span>
              )}
            </div>
          );
        })}
      </fieldset>
      {dias.length > 5 && linhas.seg.modo !== "" && (
        <div>
          <button
            type="button"
            className="btn btn-discreto"
            onClick={() =>
              setLinhas((l) => {
                const novo = { ...l };
                (["ter", "qua", "qui", "sex"] as const).forEach((d) => (novo[d] = { ...l.seg }));
                return novo;
              })
            }
          >
            Repetir o horário de segunda até sexta
          </button>
        </div>
      )}
      <div>
        <button type="submit" className="btn btn-primario" disabled={pendente || !completo}>
          {pendente ? "Salvando…" : "Salvar horário"}
        </button>
      </div>
      <Erro texto={erro} />
    </form>
  );
}

function Lista({ p, payload }: { p: Pendencia; payload: PayloadInput }) {
  const id = useId();
  const [marcados, setMarcados] = useState<string[]>([]);
  const [outro, setOutro] = useState("");
  const { pendente, erro, enviar } = useResponder(p.id);
  const opcoes = payload.opcoes ?? [];
  const alternar = (o: string) => setMarcados((l) => (l.includes(o) ? l.filter((x) => x !== o) : [...l, o]));

  return (
    <form
      className="decisao"
      aria-busy={pendente}
      onSubmit={(e) => {
        e.preventDefault();
        enviar({ tipo: "input", campo: "checklist", valor: { marcados, outro } });
      }}
    >
      <fieldset className="decisao-grupo">
        <legend>{payload.pergunta ?? "Marque o que vale"}</legend>
        {opcoes.map((o) => (
          <label key={o} className={marcados.includes(o) ? "opcao opcao-marcada" : "opcao"}>
            <input type="checkbox" checked={marcados.includes(o)} onChange={() => alternar(o)} />
            <span>
              <strong>{o}</strong>
            </span>
          </label>
        ))}
      </fieldset>
      <label htmlFor={`${id}-outro`}>Outro (opcional)</label>
      <input id={`${id}-outro`} value={outro} maxLength={200} placeholder="Algo que não está na lista" onChange={(e) => setOutro(e.target.value)} />
      <div>
        <button type="submit" className="btn btn-primario" disabled={pendente}>
          {pendente ? "Salvando…" : marcados.length || outro.trim() ? "Salvar o que vale" : "Salvar: nenhum vale"}
        </button>
      </div>
      <Erro texto={erro} />
    </form>
  );
}

function Texto({ p, payload }: { p: Pendencia; payload: PayloadInput }) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const { pendente, erro, enviar } = useResponder(p.id);
  return (
    <form
      className="decisao"
      aria-busy={pendente}
      onSubmit={(e) => {
        e.preventDefault();
        if (texto.trim()) enviar({ tipo: "input", campo: "texto", valor: texto });
      }}
    >
      <label htmlFor={id}>{payload.pergunta ?? "Sua resposta"}</label>
      <input id={id} value={texto} maxLength={300} placeholder={payload.rotulo} onChange={(e) => setTexto(e.target.value)} />
      <div>
        <button type="submit" className="btn btn-primario" disabled={pendente || !texto.trim()}>
          {pendente ? "Salvando…" : "Salvar"}
        </button>
      </div>
      <Erro texto={erro} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// external: só mostra o que precisa ser feito fora do painel
// ---------------------------------------------------------------------------
const ONDE: Record<string, string> = {
  chrome: "Só dá para fazer pelo Chrome, entrando no perfil do Google.",
  plano_pago: "Só dá para fazer com um plano pago da ferramenta de dados.",
  chrome_ou_plano: "Só dá para fazer pelo Chrome ou com um plano pago da ferramenta de dados.",
  windsor: "Falta conectar os perfis no Windsor.",
};

function Externa({ payload }: { payload: PayloadExternal }) {
  return (
    <div className="externa">
      <p>
        <strong>A rotina não consegue fazer isto sozinha.</strong> {ONDE[payload.onde ?? "chrome_ou_plano"]}
      </p>
      {payload.como && <p>{payload.como}.</p>}
      <p className="externa-fim">Depois de resolver, marque como feito.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A parte principal do card, conforme o tipo. Sem `kind`, vale "approve" (comportamento de sempre).
// ---------------------------------------------------------------------------
export function Decisao({
  p,
  podeEditar,
  mudar,
  pendente,
}: {
  p: Pendencia;
  podeEditar: boolean;
  mudar: (novo: Status) => void;
  pendente: boolean;
}) {
  if (p.status !== "aberta") return null;
  const kind = p.kind ?? "approve";
  const payload = (p.payload ?? {}) as Record<string, unknown>;

  if (kind === "external") return <Externa payload={payload as PayloadExternal} />;
  if (!podeEditar) return null;

  if (kind === "choose") return <Escolha p={p} payload={payload as PayloadChoose} />;
  if (kind === "upload") return <UploadPendencia p={p} payload={payload} />;
  if (kind === "input") {
    const entrada = payload as PayloadInput;
    if (entrada.campo === "cidades") return <Cidades p={p} payload={entrada} />;
    if (entrada.campo === "horario") return <Horario p={p} payload={entrada} />;
    if (entrada.campo === "checklist") return <Lista p={p} payload={entrada} />;
    return <Texto p={p} payload={entrada} />;
  }
  const rotulo = (payload as PayloadApprove).rotulo ?? "Aprovar";
  return (
    <div>
      <button type="button" className="btn btn-primario" disabled={pendente} onClick={() => mudar("aprovada")}>
        {rotulo}
      </button>
    </div>
  );
}
