import Link from "next/link";
import { Fase } from "./Fase";
import { camposDaPendencia, temProblema } from "@/lib/campos";
import { CAMPOS, NIVEL, estaAberta } from "@/lib/rotulos";
import { secaoDoCampo } from "@/lib/secoes";
import type { Cliente, Diagnostico, Pendencia } from "@/lib/tipos";

export function Matriz({
  clientes,
  diagnosticos,
  pendencias,
  soProblema,
  ordenarPorAbertas,
  hrefOrdem,
}: {
  clientes: Cliente[];
  diagnosticos: Map<string, Diagnostico>;
  pendencias: Pendencia[];
  soProblema: boolean;
  ordenarPorAbertas: boolean;
  hrefOrdem?: string; // liga e desliga a ordenação por "Abertas"; sem ele a coluna não é ordenável
}) {
  const abertas = pendencias.filter(estaAberta);

  const linhas = clientes
    .map((cli) => {
      const minhas = abertas.filter((p) => p.cliente_id === cli.id);
      const porCampo = new Map<string, Pendencia[]>();
      minhas.forEach((p) => camposDaPendencia(p).forEach((k) => porCampo.set(k, [...(porCampo.get(k) ?? []), p])));
      const d = diagnosticos.get(cli.id);
      return {
        cli,
        d,
        total: minhas.length,
        altas: minhas.filter((p) => p.prioridade === "alta").length,
        porCampo,
        problema: temProblema(d),
      };
    })
    .filter((l) => !soProblema || l.problema);

  // O sort do JavaScript é estável: empates ficam na ordem dos clientes
  if (ordenarPorAbertas) linhas.sort((a, b) => b.total - a.total || b.altas - a.altas);

  // No modo "só com problema" também saem as colunas em que todos os perfis mostrados estão em ordem
  const precisaAtencao = (chave: string) =>
    linhas.some((l) => {
      const nivel = l.d?.campos?.[chave]?.nivel;
      return nivel === "rever" || nivel === "falta";
    });
  const colunas = soProblema ? CAMPOS.filter((c) => precisaAtencao(c.chave)) : CAMPOS;

  return (
    <div className="matriz-rolagem">
      <table className={soProblema ? "matriz matriz-foco" : "matriz"}>
        <caption className="sr-only">Situação de cada campo do perfil por cliente. Cada bolinha leva à parte do perfil do cliente onde o campo e as pendências estão.</caption>
        <thead>
          <tr>
            <th scope="col" className="matriz-cliente">
              Cliente
            </th>
            {colunas.map((c) => (
              <th key={c.chave} scope="col" className="matriz-campo">
                <span>{c.nome}</span>
              </th>
            ))}
            <th scope="col" className="matriz-pend" aria-sort={hrefOrdem ? (ordenarPorAbertas ? "descending" : "none") : undefined}>
              {hrefOrdem ? (
                <Link href={hrefOrdem} className="matriz-ordem" title="Ordenar pelos perfis com mais pendências abertas">
                  Abertas<span aria-hidden="true"> {ordenarPorAbertas ? "↓" : "↕"}</span>
                </Link>
              ) : (
                "Abertas"
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <tr>
              <td colSpan={colunas.length + 2} className="matriz-vazia">
                Nenhum perfil com campo a rever ou faltando.
              </td>
            </tr>
          )}
          {linhas.map(({ cli, d, total, altas, porCampo }) => (
            <tr key={cli.id}>
              <th scope="row" className="matriz-cliente">
                <Link href={`/clientes/${cli.slug}`}>{cli.nome}</Link>
              </th>
              {colunas.map((c) => {
                const campo = d?.campos?.[c.chave];
                if (!campo) {
                  return (
                    <td key={c.chave} className="matriz-celula" title={c.nome}>
                      <span aria-hidden="true">–</span>
                      <span className="sr-only">{c.nome}: sem leitura</span>
                    </td>
                  );
                }
                const lista = porCampo.get(c.chave) ?? [];
                // Fora de ordem ou com pendência: leva à parte do perfil na página do cliente, onde a pendência está logo abaixo
                const destino = lista.length || campo.nivel !== "ok" ? `/clientes/${cli.slug}#parte-${secaoDoCampo(c.chave) ?? "outras"}` : null;
                const descricao = `${cli.nome}, ${c.nome}: ${NIVEL[campo.nivel]}. ${campo.valor}.${
                  lista.length ? ` ${lista.length} ${lista.length === 1 ? "pendência aberta" : "pendências abertas"}.` : ""
                }`;
                return (
                  <td key={c.chave} className="matriz-celula" title={`${c.nome}: ${campo.valor}`}>
                    {destino ? (
                      <Link href={destino} className="matriz-ponto" aria-label={descricao}>
                        <Fase nivel={campo.nivel} />
                        {lista.length > 1 && (
                          <span className="matriz-n" aria-hidden="true">
                            {lista.length}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <>
                        <Fase nivel={campo.nivel} />
                        <span className="sr-only">{campo.valor}</span>
                      </>
                    )}
                  </td>
                );
              })}
              <td className="matriz-pend">
                <Link href={`/clientes/${cli.slug}`}>{total}</Link>
                {altas > 0 && (
                  <span className="matriz-altas">
                    {altas} {altas === 1 ? "alta" : "altas"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
