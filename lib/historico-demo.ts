import type { Evento } from "./tipos";

// Só para o modo demonstração (sem Supabase): uma semana de ações de exemplo, sempre relativa a hoje,
// para a visão "Últimos 7 dias" aparecer preenchida. Com o banco conectado, nada daqui é usado.

type Exemplo = {
  dias: number; // há quantos dias (0 = hoje)
  hora: string; // horário de Brasília, HH:MM
  slug: string | null;
  tipo: string;
  origem: "rotina" | "equipe" | "analise";
  resumo: string;
  detalhe?: string;
  ok?: boolean;
};

const EXEMPLOS: Exemplo[] = [
  { dias: 0, hora: "02:41", slug: "marktiva", tipo: "post", origem: "rotina", resumo: "Postagem publicada sobre estúdio fotográfico" },
  {
    dias: 0,
    hora: "02:48",
    slug: "otica-av-rio-de-janeiro",
    tipo: "post",
    origem: "rotina",
    resumo: "Postagem publicada sobre montagem de óculos de grau",
  },
  {
    dias: 0,
    hora: "02:56",
    slug: "eletro-company",
    tipo: "servico",
    origem: "rotina",
    resumo: "Novo serviço: Lâmpadas bolinha (agora são 26 serviços)",
  },
  {
    dias: 1,
    hora: "02:39",
    slug: "clinica-central-norte",
    tipo: "resposta",
    origem: "rotina",
    resumo: "Resposta publicada a uma avaliação de 5 estrelas",
  },
  {
    dias: 1,
    hora: "02:44",
    slug: "clinica-central-norte",
    tipo: "resposta",
    origem: "rotina",
    resumo: "Resposta publicada a uma avaliação de 5 estrelas",
  },
  {
    dias: 1,
    hora: "02:52",
    slug: "zero-a-sete",
    tipo: "foto",
    origem: "rotina",
    resumo: "7 fotos enviadas à galeria",
    detalhe: "O Google aceitou o envio; a rotina confere se apareceram.",
  },
  {
    dias: 1,
    hora: "03:05",
    slug: "clinica-central-norte",
    tipo: "analise",
    origem: "rotina",
    resumo: "Avaliação de 1 estrela segurada para decisão da equipe",
  },
  { dias: 1, hora: "15:20", slug: "garagem-3", tipo: "decisao", origem: "equipe", resumo: "Aprovada: resposta a uma avaliação" },
  { dias: 2, hora: "02:40", slug: "marktiva", tipo: "foto", origem: "rotina", resumo: "8 fotos enviadas à galeria" },
  { dias: 2, hora: "02:47", slug: "otica-av-rio-de-janeiro", tipo: "servico", origem: "rotina", resumo: "7 serviços novos com descrição" },
  { dias: 2, hora: "02:55", slug: "otica-joao-candido", tipo: "area", origem: "rotina", resumo: "Área de atendimento preenchida" },
  { dias: 2, hora: "03:02", slug: "otica-joao-candido", tipo: "categoria", origem: "rotina", resumo: "2 categorias adicionais" },
  { dias: 2, hora: "03:09", slug: "otica-sergipe", tipo: "categoria", origem: "rotina", resumo: "2 categorias adicionais" },
  { dias: 2, hora: "03:16", slug: "otica-souza-naves", tipo: "categoria", origem: "rotina", resumo: "2 categorias adicionais" },
  { dias: 2, hora: "16:05", slug: "eletro-company", tipo: "decisao", origem: "equipe", resumo: "Aprovada: confirmar a capa" },
  { dias: 3, hora: "02:42", slug: "clinica-central-norte", tipo: "servico", origem: "rotina", resumo: "31 serviços com descrição" },
  { dias: 3, hora: "02:50", slug: "clinica-central-norte", tipo: "area", origem: "rotina", resumo: "Área de atendimento preenchida" },
  {
    dias: 3,
    hora: "03:01",
    slug: "aline-ceccotti",
    tipo: "post",
    origem: "rotina",
    resumo: "Não foi possível publicar a postagem",
    detalhe: "O Google recusou o texto; a rotina tenta de novo na próxima noite.",
    ok: false,
  },
  { dias: 4, hora: "02:45", slug: "dra-ana-luiza", tipo: "descricao", origem: "rotina", resumo: "Descrição do perfil atualizada" },
  { dias: 4, hora: "02:58", slug: "brava-motors", tipo: "post", origem: "rotina", resumo: "Postagem publicada sobre troca de óleo" },
  { dias: 5, hora: "02:43", slug: "kellin-obana", tipo: "post", origem: "rotina", resumo: "Postagem publicada sobre consórcio de imóvel" },
  { dias: 5, hora: "10:30", slug: null, tipo: "analise", origem: "analise", resumo: "Análise dos perfis: o que falta em cada um" },
  { dias: 6, hora: "02:46", slug: "bilumix", tipo: "servico", origem: "rotina", resumo: "Novo serviço adicionado ao perfil" },
];

// 03:00 UTC = 00:00 em Brasília
const meiaNoiteBrasilia = (agora: Date) => {
  const brasilia = new Date(agora.getTime() - 3 * 3_600_000);
  return Date.UTC(brasilia.getUTCFullYear(), brasilia.getUTCMonth(), brasilia.getUTCDate()) + 3 * 3_600_000;
};

export function eventosDemonstracao(agora: Date): Evento[] {
  const hoje = meiaNoiteBrasilia(agora);
  return EXEMPLOS.flatMap((x, i) => {
    const [h, m] = x.hora.split(":").map(Number);
    const instante = hoje - x.dias * 86_400_000 + (h * 60 + m) * 60_000;
    if (instante > agora.getTime()) return []; // o que ainda não aconteceu hoje não aparece
    return [
      {
        id: `demo-${i + 1}`,
        cliente_id: x.slug ? `c-${x.slug}` : null,
        tipo: x.tipo,
        resumo: x.resumo,
        detalhe: x.detalhe ?? null,
        origem: x.origem,
        ok: x.ok ?? true,
        ocorreu_em: new Date(instante).toISOString(),
        conferido_em: x.dias >= 1 ? new Date(instante + 10 * 60_000).toISOString() : null,
      },
    ];
  });
}
