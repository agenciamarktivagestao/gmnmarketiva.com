export type Nivel = "ok" | "rever" | "falta";
export type Prioridade = "alta" | "media" | "baixa";
export type Quem = "eu" | "voce" | "bloq";
export type Status = "aberta" | "aprovada" | "recusada" | "concluida";
export type Papel = "admin" | "editor" | "leitura";

export type Campo = { valor: string; nivel: Nivel };

export type Cliente = {
  id: string;
  slug: string;
  nome: string;
  categoria: string | null;
  cidade: string | null;
  gbp_location: string | null;
  ordem: number;
};

export type Diagnostico = {
  cliente_id: string;
  lido_em: string;
  impressoes: number;
  ligacoes: number;
  rotas: number;
  cliques_site: number;
  campos: Record<string, Campo>;
};

export type Comentario = { id: string; pendencia_id: string; autor: string; texto: string; criado_em: string };

export type Pendencia = {
  id: string;
  cliente_id: string | null;
  titulo: string;
  detalhe: string | null;
  prioridade: Prioridade;
  quem: Quem;
  status: Status;
  origem: string;
  decidido_por: string | null;
  decidido_em: string | null;
  criado_em: string;
  comentarios: Comentario[];
};

export type Evento = {
  id: string;
  cliente_id: string | null;
  tipo: string;
  resumo: string;
  detalhe: string | null;
  origem: string;
  ok: boolean;
  ocorreu_em: string;
};

export type Membro = { email: string; nome: string | null; papel: Papel };
export type Usuario = { email: string; papel: Papel | null };
