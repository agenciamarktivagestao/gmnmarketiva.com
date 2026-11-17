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
  servicos_padrao: number;
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

// Tipo de resposta que a pendência pede. Sem `kind` (pendências antigas), vale "approve".
export type Kind = "approve" | "choose" | "input" | "upload" | "external";

export type OpcaoEscolha = { valor: string; rotulo: string; detalhe?: string };
export type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

// O que cada tipo de pendência guarda em `payload` (tudo opcional: o painel tem um padrão para cada campo)
// Uma avaliação do Google que espera resposta, com a resposta sugerida no tom do cliente
export type Avaliacao = {
  review_id: string;
  avaliador: string;
  estrelas: number;
  texto?: string | null;
  data: string; // ISO: quando a avaliação foi escrita
  resposta_sugerida: string;
};
export type PayloadApprove = { rotulo?: string; avaliacoes?: Avaliacao[]; aviso?: string };
export type PayloadChoose = { pergunta?: string; opcoes?: OpcaoEscolha[]; permitir_outro?: boolean };
export type PayloadInput = {
  campo?: "cidades" | "horario" | "checklist" | "texto";
  pergunta?: string;
  rotulo?: string;
  opcoes?: string[];
  dias?: DiaSemana[];
};
export type PayloadUpload = { categoria?: "COVER" | "ADDITIONAL"; varias?: boolean; sugestao?: string };
export type PayloadExternal = { onde?: "chrome" | "plano_pago" | "chrome_ou_plano" | "windsor"; como?: string };

export type Pendencia = {
  id: string;
  cliente_id: string | null;
  titulo: string;
  detalhe: string | null;
  prioridade: Prioridade;
  quem: Quem;
  status: Status;
  origem: string;
  kind?: Kind | null;
  payload?: Record<string, unknown> | null;
  // Gravado pelo painel quando a equipe responde (resumo é o texto que a rotina também recebe como comentário)
  resposta?: { tipo?: string; valor?: unknown; resumo?: string; em?: string } | null;
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

// Uma linha do registro de mudanças (/novidades)
export type TipoMudanca = "painel" | "dados" | "rotina";
export type Mudanca = {
  id: string;
  feito_em: string;
  titulo: string;
  resumo: string;
  itens: string[];
  como_testar: string | null;
  pendente: string | null;
  tipo: TipoMudanca;
  commit_sha: string | null;
  autor: string;
};

export type Membro = { email: string; nome: string | null; papel: Papel };
export type Usuario = { email: string; papel: Papel | null };

export type Tratamento = "voce" | "senhor" | "neutro";
export type Emojis = "nenhum" | "poucos" | "livre";
export type Aprovacao = "automatica" | "manual";

// cliente_id nulo = diretriz geral do sistema
export type Diretriz = {
  id: string;
  cliente_id: string | null;
  ideia_principal: string;
  tom: string;
  tratamento: Tratamento;
  emojis: Emojis;
  assinatura: string;
  usar: string;
  evitar: string;
  exemplo_resposta: string;
  exemplo_postagem: string;
  aprovacao: Aprovacao;
  revisado: boolean;
  atualizado_em: string;
  atualizado_por: string | null;
};

export type StatusServico = "no_perfil" | "sugerido" | "aprovado" | "recusado";
export type Servico = {
  id: string;
  cliente_id: string;
  nome: string;
  descricao: string;
  categoria_gbp: string | null;
  status: StatusServico;
  origem: "perfil" | "rotina" | "equipe";
  decidido_por: string | null;
  decidido_em: string | null;
  atualizado_em: string;
};

export type CategoriaMidia = "ADDITIONAL" | "COVER" | "PROFILE";
export type StatusMidia = "na_fila" | "enviada" | "cancelada";
export type Midia = {
  id: string;
  cliente_id: string;
  caminho: string;
  url: string;
  nome_original: string | null;
  largura: number | null;
  altura: number | null;
  bytes: number | null;
  categoria: CategoriaMidia;
  nota: string | null;
  status: StatusMidia;
  enviada_em: string | null;
  criado_por: string | null;
  criado_em: string;
};

export type TipoConteudo = "postagem" | "resposta";
export type StatusConteudo = "rascunho" | "aprovado" | "publicado" | "recusado";
export type Conteudo = {
  id: string;
  cliente_id: string;
  tipo: TipoConteudo;
  avaliador: string | null;
  estrelas: number | null;
  avaliacao: string | null;
  review_id: string | null;
  texto: string;
  midia_id: string | null;
  status: StatusConteudo;
  origem: "rotina" | "equipe";
  decidido_por: string | null;
  decidido_em: string | null;
  publicado_em: string | null;
  criado_em: string;
};
