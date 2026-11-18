import type { Metadata } from "next";
import { FormAjustesClientes } from "@/components/FormAjustesClientes";
import { FormAjustesGerais } from "@/components/FormAjustesGerais";
import { listarAjustesClientes, listarClientes, listarExecucoes, lerAjustesRotina, usuarioAtual } from "@/lib/dados";
import { dataCurta, hora } from "@/lib/rotulos";
import { JANELA_ROTINA } from "@/lib/semana";
import { ajustesPorCliente } from "@/lib/rotina";

export const metadata: Metadata = { title: "Rotina" };

export default async function PaginaRotina() {
  const [usuario, ajustes, clientes, linhas, execucoes] = await Promise.all([
    usuarioAtual(),
    lerAjustesRotina(),
    listarClientes(),
    listarAjustesClientes(),
    listarExecucoes(7),
  ]);
  const eAdmin = usuario?.papel === "admin";
  const podeEditar = eAdmin || usuario?.papel === "editor";
  const porCliente = ajustesPorCliente(
    linhas,
    clientes.map((c) => c.id),
  );
  const restritos = [...porCliente.values()].filter((a) => a.pausada || !a.fotos || !a.servicos || !a.postagens || !a.respostas).length;

  return (
    <>
      <section className="abertura">
        <h1>Rotina da madrugada</h1>
        <p className="lead">
          Aqui você decide o que a rotina pode fazer. Ela roda todos os dias, {JANELA_ROTINA}, e lê estes ajustes antes de começar. Os
          limites de segurança dela continuam valendo: estes ajustes só restringem, nunca liberam mais.
        </p>
      </section>

      <p className={`rotina-situacao${ajustes.ativa ? "" : " rotina-situacao-pausada"}`} role="status">
        <strong>{ajustes.ativa ? "Rotina ativa" : "Rotina pausada"}</strong>
        <span>
          {ajustes.ativa
            ? `Meta de ${ajustes.meta_minima} a ${ajustes.limite_ajustes} ajustes por noite${restritos > 0 ? `; ${restritos} ${restritos === 1 ? "cliente tem" : "clientes têm"} restrição.` : "; todos os clientes liberados."}`
            : "Na próxima madrugada ela só lê e registra, sem alterar nenhum perfil."}
        </span>
        {ajustes.atualizado_em && (
          <span className="dica">
            Última mudança em {dataCurta(ajustes.atualizado_em)}, {hora(ajustes.atualizado_em)}
            {ajustes.atualizado_por ? `, por ${ajustes.atualizado_por.split("@")[0]}` : ""}.
          </span>
        )}
      </p>

      <section aria-labelledby="t-geral" className="semana-bloco">
        <h2 id="t-geral">Ajustes gerais</h2>
        <FormAjustesGerais ajustes={ajustes} podeMudar={eAdmin} />
      </section>

      <section aria-labelledby="t-clientes" className="semana-bloco">
        <h2 id="t-clientes">Cada cliente</h2>
        <p className="dica-secao">
          Cliente que você não mexer fica com tudo liberado. Pausar um cliente faz a rotina pular ele por completo, inclusive no rodízio dos
          mais antigos.
        </p>
        <FormAjustesClientes clientes={clientes} ajustes={porCliente} podeEditar={podeEditar} />
      </section>

      <section aria-labelledby="t-rodadas" className="semana-bloco">
        <h2 id="t-rodadas">Últimas rodadas</h2>
        {execucoes.length === 0 ? (
          <p className="vazio">Nenhuma rodada registrada ainda. A próxima madrugada aparece aqui.</p>
        ) : (
          <ul className="rotina-rodadas">
            {execucoes.map((x) => (
              <li key={x.id}>
                <span className="evento-quando">
                  {dataCurta(x.iniciada_em)}, {hora(x.iniciada_em)}
                </span>
                <span>{x.resumo || "Sem resumo registrado."}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
