// A "foto" do perfil do Google que a rotina grava em `perfis_leitura` a cada rodada.
// O painel só lê essa foto para desenhar a prévia; ele não chama o Google.

export type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
export type Periodo = { dia: DiaSemana; abre: string; fecha: string }; // "09:00", "18:00" ("24:00" = vai até meia-noite)

export type FotoPerfil = {
  url: string;
  categoria: "capa" | "fachada" | "foto";
  largura: number;
  altura: number;
  criada_em: string;
};

export type AvaliacaoPerfil = {
  id: string;
  autor: string;
  estrelas: number;
  texto: string;
  data: string; // AAAA-MM-DD
  resposta: string | null;
  resposta_em: string | null;
};

export type PostPerfil = { texto: string; data: string; imagem?: string | null };

export type DadosPerfil = {
  titulo: string;
  categoria: string | null;
  categorias_extras: string[];
  endereco: string;
  telefone: string | null;
  site: string | null;
  mapa: string | null;
  descricao: string;
  horario: Periodo[];
  servicos: string[];
  area: string[];
  atributos: string[];
  atributos_total: number;
  links: Record<string, string>;
  nota: number | null;
  total_avaliacoes: number;
  fotos: FotoPerfil[];
  fotos_janela_dias: number;
  avaliacoes: AvaliacaoPerfil[];
  avaliacoes_janela_dias: number;
  posts: PostPerfil[];
};

export type PerfilLido = { lido_em: string; dados: DadosPerfil; demonstracao?: boolean };

// ---------------------------------------------------------------------------
// Leitura segura: a rotina pode gravar só uma parte dos campos
// ---------------------------------------------------------------------------
const texto = (v: unknown, padrao = ""): string => (typeof v === "string" ? v : padrao);
const textoOuNulo = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const numeroOuNulo = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const listaDeTextos = (v: unknown): string[] => lista(v).filter((x): x is string => typeof x === "string" && x.trim() !== "");
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

const DIAS: DiaSemana[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

export function normalizarPerfil(bruto: unknown): DadosPerfil {
  const d = objeto(bruto);
  const links: Record<string, string> = {};
  for (const [k, v] of Object.entries(objeto(d.links))) if (typeof v === "string" && /^https?:\/\//.test(v)) links[k] = v;
  return {
    titulo: texto(d.titulo),
    categoria: textoOuNulo(d.categoria),
    categorias_extras: listaDeTextos(d.categorias_extras),
    endereco: texto(d.endereco),
    telefone: textoOuNulo(d.telefone),
    site: textoOuNulo(d.site),
    mapa: textoOuNulo(d.mapa),
    descricao: texto(d.descricao),
    horario: lista(d.horario)
      .map(objeto)
      .filter((p) => DIAS.includes(p.dia as DiaSemana) && typeof p.abre === "string" && typeof p.fecha === "string")
      .map((p) => ({ dia: p.dia as DiaSemana, abre: p.abre as string, fecha: p.fecha as string })),
    servicos: listaDeTextos(d.servicos),
    area: listaDeTextos(d.area),
    atributos: listaDeTextos(d.atributos),
    atributos_total: numeroOuNulo(d.atributos_total) ?? 0,
    links,
    nota: numeroOuNulo(d.nota),
    total_avaliacoes: numeroOuNulo(d.total_avaliacoes) ?? 0,
    fotos: lista(d.fotos)
      .map(objeto)
      .filter((f) => typeof f.url === "string" && /^(https:|data:image\/)/.test(f.url as string))
      .map((f) => ({
        url: f.url as string,
        categoria: f.categoria === "capa" || f.categoria === "fachada" ? f.categoria : "foto",
        largura: numeroOuNulo(f.largura) ?? 0,
        altura: numeroOuNulo(f.altura) ?? 0,
        criada_em: texto(f.criada_em),
      })),
    fotos_janela_dias: numeroOuNulo(d.fotos_janela_dias) ?? 30,
    avaliacoes: lista(d.avaliacoes)
      .map(objeto)
      .map((a) => ({
        id: texto(a.id),
        autor: texto(a.autor, "Anônimo") || "Anônimo",
        estrelas: Math.min(5, Math.max(0, Math.round(numeroOuNulo(a.estrelas) ?? 0))),
        texto: limparComentario(texto(a.texto)),
        data: texto(a.data),
        resposta: textoOuNulo(a.resposta),
        resposta_em: textoOuNulo(a.resposta_em),
      })),
    avaliacoes_janela_dias: numeroOuNulo(d.avaliacoes_janela_dias) ?? 30,
    posts: lista(d.posts)
      .map(objeto)
      .filter((p) => typeof p.texto === "string")
      .map((p) => ({ texto: p.texto as string, data: texto(p.data), imagem: textoOuNulo(p.imagem) })),
  };
}

// O Google junta o texto traduzido ao original: "Ótima (Translated by Google) Excellent".
// O que interessa é o que a pessoa escreveu.
export function limparComentario(bruto: string): string {
  const t = bruto.trim();
  const marca = "(Translated by Google)";
  if (t.startsWith(marca)) {
    const original = t.match(/\(Original\)\s*([\s\S]*)$/);
    return (original ? original[1] : t.slice(marca.length)).trim();
  }
  const i = t.indexOf(marca);
  return i === -1 ? t : t.slice(0, i).trim();
}

// ---------------------------------------------------------------------------
// Horário de funcionamento
// ---------------------------------------------------------------------------
const NOME_DIA: Record<DiaSemana, string> = {
  seg: "Segunda",
  ter: "Terça",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sábado",
  dom: "Domingo",
};

// "09:00" -> "9h", "13:30" -> "13h30"
export function formatarHora(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  const hora = String(Number(h));
  return m && Number(m) !== 0 ? `${hora}h${m.padStart(2, "0")}` : `${hora}h`;
}

const doDia = (periodos: Periodo[]): string => {
  if (periodos.length === 0) return "Fechado";
  if (periodos.length === 1 && periodos[0].abre === "00:00" && periodos[0].fecha === "24:00") return "24 horas";
  return periodos.map((p) => `${formatarHora(p.abre)}–${formatarHora(p.fecha)}`).join(" e ");
};

const nomeDoTrecho = (dias: DiaSemana[]): string => {
  if (dias.length === 7) return "Todos os dias";
  const nomes = dias.map((d) => NOME_DIA[d]);
  if (nomes.length === 1) return nomes[0];
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1].toLowerCase()}`;
  return `${nomes[0]} a ${nomes[nomes.length - 1].toLowerCase()}`;
};

// Junta dias seguidos com o mesmo horário: "Segunda a sexta: 9h–18h". Sem nenhum período, não há o que mostrar.
export function resumoHorario(periodos: Periodo[]): { dias: string; horas: string }[] {
  if (periodos.length === 0) return [];
  const textos = DIAS.map((dia) => doDia(periodos.filter((p) => p.dia === dia).sort((a, b) => a.abre.localeCompare(b.abre))));
  const trechos: { dias: DiaSemana[]; horas: string }[] = [];
  DIAS.forEach((dia, i) => {
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && ultimo.horas === textos[i]) ultimo.dias.push(dia);
    else trechos.push({ dias: [dia], horas: textos[i] });
  });
  return trechos.map((t) => ({ dias: nomeDoTrecho(t.dias), horas: t.horas }));
}

// ---------------------------------------------------------------------------
// Pequenos formatadores
// ---------------------------------------------------------------------------
// "2026-11-14" ou "2026-11-14T20:00:00Z" -> "14/11/2026", sem passar por fuso (a data já é a do Brasil)
export function dataBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export const notaBR = (nota: number): string => nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function linkTelefone(telefone: string | null): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return `tel:+${digitos.length <= 11 ? "55" : ""}${digitos}`;
}

export function linkRota(dados: Pick<DadosPerfil, "endereco" | "mapa" | "titulo">): string | null {
  if (dados.mapa) return dados.mapa;
  const busca = [dados.titulo, dados.endereco].filter(Boolean).join(", ");
  return busca ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}` : null;
}

export const capaDe = (fotos: FotoPerfil[]): FotoPerfil | null => fotos.find((f) => f.categoria === "capa") ?? fotos[0] ?? null;

export const NOME_LINK: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  appointment: "Agendamento",
};
