import type { Nivel, Prioridade, Quem, Status } from "./tipos";

// Ordem das colunas do painel e nome de cada campo do perfil
export const CAMPOS: { chave: string; nome: string }[] = [
  { chave: "descricao", nome: "Descrição" },
  { chave: "servicos", nome: "Serviços" },
  { chave: "categorias", nome: "Categorias" },
  { chave: "area", nome: "Área" },
  { chave: "horario", nome: "Horário" },
  { chave: "atributos", nome: "Atributos" },
  { chave: "nome", nome: "Nome" },
  { chave: "endereco", nome: "Endereço" },
  { chave: "fotos", nome: "Fotos" },
  { chave: "capa", nome: "Capa" },
  { chave: "avaliacoes", nome: "Avaliações" },
  { chave: "posts", nome: "Posts" },
];

export const NIVEL: Record<Nivel, string> = { ok: "Em ordem", rever: "A rever", falta: "Falta" };
export const PRIORIDADE: Record<Prioridade, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
export const QUEM: Record<Quem, string> = {
  eu: "A rotina faz",
  voce: "Depende de você",
  bloq: "Chrome ou plano pago",
};
// Nas abas de Pendências: o mesmo nome que a etiqueta de cada card usa
export const QUEM_ABA: Record<Quem, string> = { voce: "Esperam você", eu: "A rotina faz", bloq: "Chrome ou plano pago" };

export const estaAberta = (p: { status: Status }) => p.status === "aberta" || p.status === "aprovada";
export const STATUS: Record<Status, string> = {
  aberta: "Aberta",
  aprovada: "Aprovada",
  recusada: "Recusada",
  concluida: "Feita",
};
export const TIPO_EVENTO: Record<string, string> = {
  foto: "Foto",
  servico: "Serviço",
  categoria: "Categoria",
  resposta: "Resposta",
  post: "Postagem",
  area: "Área de atendimento",
  descricao: "Descrição",
  atributo: "Atributos",
  analise: "Análise",
  decisao: "Decisão",
  outro: "Outro",
};

const PESO_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };
const PESO_STATUS: Record<Status, number> = { aberta: 0, aprovada: 1, recusada: 2, concluida: 3 };
export const ordenarPendencias = <T extends { prioridade: Prioridade; status: Status; criado_em: string }>(l: T[]) =>
  [...l].sort(
    (a, b) =>
      PESO_STATUS[a.status] - PESO_STATUS[b.status] ||
      PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
      a.criado_em.localeCompare(b.criado_em),
  );

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
export const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
