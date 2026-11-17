import type { Mudanca, TipoMudanca } from "./tipos";

export const TIPO_MUDANCA: Record<TipoMudanca, string> = { painel: "Painel", dados: "Dados", rotina: "Rotina" };

const REPOSITORIO = "https://github.com/agenciamarktivagestao/gmnmarketiva.com";

// Nova = feita depois da última vez que a pessoa abriu as novidades (sem registro, tudo é novo)
export function ehNova(feitoEm: string, vistoAte: string | null): boolean {
  if (!vistoAte) return true;
  return Date.parse(feitoEm) > Date.parse(vistoAte);
}

export const contarNovas = (mudancas: { feito_em: string }[], vistoAte: string | null): number =>
  mudancas.filter((m) => ehNova(m.feito_em, vistoAte)).length;

// Só abre o commit quando o código parece mesmo um hash do git
export function linkDoCommit(sha: string | null): string | null {
  return sha && /^[0-9a-f]{7,40}$/.test(sha) ? `${REPOSITORIO}/commit/${sha}` : null;
}

// Leitura tolerante: o registro vem do banco ou do arquivo de demonstração e pode ter campos faltando
export function normalizarMudancas(bruto: unknown): Mudanca[] {
  if (!Array.isArray(bruto)) return [];
  const texto = (v: unknown): string => (typeof v === "string" ? v : "");
  const textoOuNulo = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
  return bruto
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object" && !Array.isArray(m))
    .map((m, i) => ({
      id: texto(m.id) || `m-${i}`,
      feito_em: texto(m.feito_em),
      titulo: texto(m.titulo),
      resumo: texto(m.resumo),
      itens: Array.isArray(m.itens) ? m.itens.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [],
      como_testar: textoOuNulo(m.como_testar),
      pendente: textoOuNulo(m.pendente),
      tipo: (m.tipo === "dados" || m.tipo === "rotina" ? m.tipo : "painel") as TipoMudanca,
      commit_sha: textoOuNulo(m.commit_sha),
      autor: texto(m.autor) || "Claude",
    }))
    .filter((m) => m.titulo && !Number.isNaN(Date.parse(m.feito_em)))
    .sort((a, b) => Date.parse(b.feito_em) - Date.parse(a.feito_em));
}
