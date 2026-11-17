import type { DadosPerfil, DiaSemana, FotoPerfil, Periodo, PerfilLido } from "./perfil";
import type { Cliente, Diagnostico } from "./tipos";

// Só para o modo demonstração: um perfil inventado para cada cliente. Nada aqui vem do Google.
const imagem = (cor1: string, cor2: string, rotulo: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cor1}"/><stop offset="1" stop-color="${cor2}"/></linearGradient></defs><rect width="600" height="450" fill="url(#g)"/><text x="300" y="235" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#fff" fill-opacity=".9">${rotulo}</text></svg>`,
  )}`;

const FOTOS: FotoPerfil[] = [
  { url: imagem("#0a0b10", "#1457e6", "Capa de exemplo"), categoria: "capa", largura: 600, altura: 450, criada_em: "2026-11-10T12:00:00Z" },
  { url: imagem("#1457e6", "#0f43b8", "Foto de exemplo 1"), categoria: "foto", largura: 600, altura: 450, criada_em: "2026-11-08T12:00:00Z" },
  { url: imagem("#0f43b8", "#6aa2ff", "Foto de exemplo 2"), categoria: "foto", largura: 600, altura: 450, criada_em: "2026-11-05T12:00:00Z" },
  { url: imagem("#4b5366", "#0a0b10", "Foto de exemplo 3"), categoria: "foto", largura: 600, altura: 450, criada_em: "2026-11-02T12:00:00Z" },
];

const DIAS_UTEIS: DiaSemana[] = ["seg", "ter", "qua", "qui", "sex"];
const HORARIO: Periodo[] = [...DIAS_UTEIS.map((dia) => ({ dia, abre: "09:00", fecha: "18:00" })), { dia: "sab", abre: "09:00", fecha: "12:00" }];

export function perfilDemonstracao(cliente: Cliente, diagnostico?: Diagnostico): PerfilLido {
  const semFotos = diagnostico?.campos.fotos?.nivel === "falta" && diagnostico?.campos.capa?.nivel === "falta";
  const dados: DadosPerfil = {
    titulo: cliente.nome,
    categoria: cliente.categoria,
    categorias_extras: ["Categoria de exemplo"],
    endereco: `Rua Exemplo, 100, ${cliente.cidade ?? "Londrina"}`,
    telefone: "(43) 99999-0000",
    site: null,
    mapa: null,
    descricao: "Descrição de exemplo do modo demonstração. Com o Supabase conectado, aqui aparece o texto que está no perfil do Google.",
    horario: HORARIO,
    servicos: ["Serviço de exemplo 1", "Serviço de exemplo 2", "Serviço de exemplo 3", "Serviço de exemplo 4"],
    area: ["Londrina", "Cambé"],
    atributos: ["Wi-Fi grátis", "Cartão de crédito", "Cartão de débito"],
    atributos_total: 3,
    links: {},
    nota: 4.6,
    total_avaliacoes: 128,
    fotos: semFotos ? [] : FOTOS,
    fotos_janela_dias: 30,
    avaliacoes: [
      { id: "demo-1", autor: "Cliente Exemplo A", estrelas: 5, texto: "Avaliação de exemplo.", data: "2026-11-12", resposta: "Resposta de exemplo da equipe.", resposta_em: "2026-11-13" },
      { id: "demo-2", autor: "Cliente Exemplo B", estrelas: 4, texto: "Outra avaliação de exemplo, ainda sem resposta.", data: "2026-11-09", resposta: null, resposta_em: null },
    ],
    avaliacoes_janela_dias: 30,
    posts: [],
  };
  return { lido_em: "2026-11-16T21:00:00Z", dados, demonstracao: true };
}
