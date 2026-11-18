import type { Evento } from "./tipos";

// Link de acompanhamento do cliente: o que a página pública recebe do banco e como o link é montado.
// Este arquivo só importa tipos de outros: os testes rodam direto no Node.

// 43 caracteres de base64url (256 bits sorteados); o banco aceita de 32 a 128
export const TOKEN_FORMATO = /^[A-Za-z0-9_-]{32,128}$/;
export const tokenComFormato = (token: string) => TOKEN_FORMATO.test(token);

// Link que existe só no modo demonstração (sem Supabase), para dar para testar a página
export const TOKEN_DEMO = "demonstracao-marktiva-sem-dados-reais";

export type LinkDoCliente = { token: string; criado_em: string; acessos: number; ultimo_acesso: string | null };

export type Acompanhamento = {
  cliente: { nome: string; categoria: string | null; cidade: string | null };
  eventos: Evento[];
  diagnostico: { lido_em: string; impressoes: number; ligacoes: number; rotas: number; cliques_site: number } | null;
  geradoEm: string;
};

// "https://painel.exemplo.com" + token -> "https://painel.exemplo.com/p/<token>"
export const linkPublico = (origem: string, token: string) => `${origem.replace(/\/+$/, "")}/p/${token}`;

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const inteiro = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const registro = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

// Confere a resposta da função pública do banco. Devolve null se não for o que se espera, e descarta qualquer
// campo que não esteja na lista: a página só mostra o que passou por aqui.
export function lerRespostaPublica(bruto: unknown): Acompanhamento | null {
  const r = registro(bruto);
  const cliente = registro(r?.cliente);
  const nome = texto(cliente?.nome);
  const geradoEm = texto(r?.gerado_em);
  if (!r || !cliente || !nome || !geradoEm || !Array.isArray(r.eventos)) return null;

  const eventos: Evento[] = [];
  for (const item of r.eventos) {
    const e = registro(item);
    const id = texto(e?.id);
    const tipo = texto(e?.tipo);
    const resumo = texto(e?.resumo);
    const quando = texto(e?.ocorreu_em);
    if (!e || !id || !tipo || !resumo || !quando || Number.isNaN(Date.parse(quando))) continue;
    // O banco não manda "detalhe", origem nem ações que falharam: aqui entram só como valores neutros
    eventos.push({ id, cliente_id: null, tipo, resumo, detalhe: null, origem: "publico", ok: true, ocorreu_em: quando });
  }

  const d = registro(r.diagnostico);
  const lido = texto(d?.lido_em);
  return {
    cliente: { nome, categoria: texto(cliente.categoria), cidade: texto(cliente.cidade) },
    eventos,
    diagnostico:
      d && lido
        ? {
            lido_em: lido,
            impressoes: inteiro(d.impressoes),
            ligacoes: inteiro(d.ligacoes),
            rotas: inteiro(d.rotas),
            cliques_site: inteiro(d.cliques_site),
          }
        : null,
    geradoEm,
  };
}
