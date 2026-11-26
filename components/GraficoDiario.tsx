"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

export type PontoDoGrafico = {
  dia: string; // AAAA-MM-DD
  curto: string; // "23/11"
  longo: string; // "segunda-feira, 23 de novembro"
  valor: number | null;
  media: number | null; // média dos últimos 7 dias
};

export type MarcaDoGrafico = { dia: string; texto: string };

const MARGEM = { esq: 38, dir: 12, topo: 10 };
const ALTURA_DO_GRAFICO = 180;
const FAIXA_DAS_MARCAS = 22;
const FAIXA_DO_EIXO = 24;
const ALTURA_TOTAL = MARGEM.topo + ALTURA_DO_GRAFICO + FAIXA_DAS_MARCAS + FAIXA_DO_EIXO;
const ESPACO_ENTRE_ROTULOS = 46; // largura mínima de cada data no eixo
const RAIO_DO_TOPO = 4;

// O menor número "redondo" (1, 2, 5 × 10^k) que cabe o maior valor
function tetoRedondo(max: number): number {
  if (max <= 1) return 1;
  const base = 10 ** Math.floor(Math.log10(max));
  return ([1, 2, 5, 10].map((m) => m * base).find((c) => c >= max) ?? max) as number;
}

const numero = (n: number) => n.toLocaleString("pt-BR");
const arredondar = (n: number) => Math.round(n * 10) / 10;

// Losango centrado em (x, y): o marcador dos dias em que agimos (forma própria, para não se confundir com o ponto da média)
const losango = (x: number, y: number, r: number) => `M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`;

// Coluna fina com a ponta de cima arredondada e a base reta
function colunaArredondada(x: number, y: number, largura: number, base: number): string {
  const r = Math.min(RAIO_DO_TOPO, largura / 2, base - y);
  if (r <= 0) return `M${x} ${base}h${largura}v-1h-${largura}z`;
  return `M${x} ${base}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + largura - r}Q${x + largura} ${y} ${x + largura} ${y + r}V${base}Z`;
}

export function GraficoDiario({
  pontos,
  marcas,
  unidade,
  descricao,
}: {
  pontos: PontoDoGrafico[];
  marcas: MarcaDoGrafico[];
  unidade: { um: string; varios: string }; // "vez" / "vezes"
  descricao: string;
}) {
  const idDoTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setLargura(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const n = pontos.length;
  const areaX = largura - MARGEM.esq - MARGEM.dir;
  const passo = areaX / n;
  const larguraDaColuna = Math.min(16, Math.max(3, passo * 0.55)); // coluna fina: sempre sobra ar entre uma e outra
  const xCentro = (i: number) => MARGEM.esq + passo * i + passo / 2;
  const base = MARGEM.topo + ALTURA_DO_GRAFICO;
  const teto = tetoRedondo(Math.max(1, ...pontos.map((p) => Math.max(p.valor ?? 0, p.media ?? 0))));
  const y = (v: number) => base - (v / teto) * ALTURA_DO_GRAFICO;
  const marcasPorDia = new Map(marcas.map((m) => [m.dia, m.texto]));

  // Uma data a cada tantas colunas, para os rótulos não se tocarem; a última sempre aparece
  const cada = Math.max(1, Math.ceil(ESPACO_ENTRE_ROTULOS / passo));
  const mostraData = (i: number) => (n - 1 - i) % cada === 0;

  // A média vira traço contínuo; onde falta dia, o traço se abre
  let traco = "";
  let abre = true;
  pontos.forEach((p, i) => {
    if (p.media === null) {
      abre = true;
      return;
    }
    traco += `${abre ? "M" : "L"}${xCentro(i).toFixed(1)} ${y(p.media).toFixed(1)}`;
    abre = false;
  });
  const ultimaMedia = pontos.reduce((u, p, i) => (p.media !== null ? i : u), -1);

  const escolher = (e: PointerEvent<SVGSVGElement>) => {
    const caixaSvg = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - caixaSvg.left - MARGEM.esq) / passo);
    setAtivo(i < 0 ? 0 : i >= n ? n - 1 : i);
  };

  const teclas = (e: KeyboardEvent<HTMLDivElement>) => {
    const vai = (i: number) => {
      e.preventDefault();
      setAtivo(Math.min(n - 1, Math.max(0, i)));
    };
    if (e.key === "ArrowLeft") vai((ativo ?? n) - 1);
    else if (e.key === "ArrowRight") vai((ativo ?? -1) + 1);
    else if (e.key === "Home") vai(0);
    else if (e.key === "End") vai(n - 1);
    else if (e.key === "Escape") setAtivo(null);
  };

  const p = ativo !== null ? pontos[ativo] : null;
  const marcaAtiva = p ? marcasPorDia.get(p.dia) : undefined;
  const leitura = p
    ? `${p.longo}: ${p.valor === null ? "sem número" : `${numero(p.valor)} ${p.valor === 1 ? unidade.um : unidade.varios}`}${
        p.media !== null ? `. Média dos 7 dias até aqui: ${numero(arredondar(p.media))}` : ""
      }${marcaAtiva ? `. Neste dia agimos no perfil: ${marcaAtiva}` : ""}`
    : "";
  const lado = ativo !== null && xCentro(ativo) > largura / 2 ? "esq" : "dir";

  return (
    <div className="grafico" ref={caixa}>
      <div
        className="grafico-area"
        role="group"
        aria-labelledby={idDoTitulo}
        tabIndex={0}
        onKeyDown={teclas}
        onBlur={() => setAtivo(null)}
        onFocus={() => setAtivo((a) => a ?? n - 1)}
      >
        <span id={idDoTitulo} className="sr-only">
          {descricao} Use as setas para a esquerda e para a direita para ver cada dia. Os mesmos números estão na tabela logo abaixo.
        </span>
        <svg
          width={largura}
          height={ALTURA_TOTAL}
          viewBox={`0 0 ${largura} ${ALTURA_TOTAL}`}
          aria-hidden="true"
          onPointerMove={escolher}
          onPointerDown={escolher}
          onPointerLeave={(e) => e.pointerType === "mouse" && setAtivo(null)}
          className="grafico-svg"
        >
          {/* Grade: três linhas finas e sólidas, só para o olho se orientar */}
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={MARGEM.esq} x2={largura - MARGEM.dir} y1={y(teto * f)} y2={y(teto * f)} className="grafico-grade" />
              <text x={MARGEM.esq - 8} y={y(teto * f) + 4} textAnchor="end" className="grafico-texto">
                {numero(teto * f)}
              </text>
            </g>
          ))}

          {ativo !== null && <line x1={xCentro(ativo)} x2={xCentro(ativo)} y1={MARGEM.topo} y2={base} className="grafico-mira" />}

          {pontos.map((pt, i) =>
            pt.valor === null ? null : (
              <path
                key={pt.dia}
                d={colunaArredondada(xCentro(i) - larguraDaColuna / 2, y(pt.valor), larguraDaColuna, base)}
                className={i === ativo ? "grafico-coluna grafico-coluna-ativa" : "grafico-coluna"}
              />
            ),
          )}

          <path d={traco} className="grafico-media" />
          {ultimaMedia >= 0 && (
            <>
              <circle cx={xCentro(ultimaMedia)} cy={y(pontos[ultimaMedia].media as number)} r={6} className="grafico-anel" />
              <circle cx={xCentro(ultimaMedia)} cy={y(pontos[ultimaMedia].media as number)} r={4} className="grafico-ponto" />
              <text x={xCentro(ultimaMedia)} y={y(pontos[ultimaMedia].media as number) - 12} textAnchor="end" className="grafico-texto grafico-rotulo-final">
                média: {numero(arredondar(pontos[ultimaMedia].media as number))}
              </text>
            </>
          )}

          {/* Dias em que agimos no perfil */}
          {pontos.map((pt, i) =>
            marcasPorDia.has(pt.dia) ? (
              <g key={pt.dia}>
                <path d={losango(xCentro(i), base + FAIXA_DAS_MARCAS / 2, 8)} className="grafico-anel" />
                <path d={losango(xCentro(i), base + FAIXA_DAS_MARCAS / 2, 5.5)} className="grafico-marca" />
              </g>
            ) : null,
          )}

          {pontos.map((pt, i) =>
            mostraData(i) ? (
              <text key={pt.dia} x={xCentro(i)} y={base + FAIXA_DAS_MARCAS + 16} textAnchor="middle" className="grafico-texto">
                {pt.curto}
              </text>
            ) : null,
          )}
        </svg>

        {p && (
          <div className={`grafico-dica grafico-dica-${lado}`} style={lado === "dir" ? { left: xCentro(ativo!) + 14 } : { right: largura - xCentro(ativo!) + 14 }} aria-hidden="true">
            <span className="grafico-dica-dia">{p.longo}</span>
            <strong>
              {p.valor === null ? "sem número" : `${numero(p.valor)} ${p.valor === 1 ? unidade.um : unidade.varios}`}
            </strong>
            {p.media !== null && (
              <span className="grafico-dica-linha">
                <span className="grafico-chave" /> média dos 7 dias: {numero(arredondar(p.media))}
              </span>
            )}
            {marcaAtiva && <span className="grafico-dica-linha grafico-dica-acao">Agimos neste dia: {marcaAtiva}</span>}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {leitura}
      </p>
      <ul className="grafico-legenda" aria-label="Legenda do gráfico">
        <li>
          <span className="grafico-legenda-coluna" aria-hidden="true" /> Por dia
        </li>
        <li>
          <span className="grafico-legenda-linha" aria-hidden="true" /> Média dos últimos 7 dias
        </li>
        {marcas.length > 0 && (
          <li>
            <span className="grafico-legenda-marca" aria-hidden="true" /> Dia em que agimos no perfil
          </li>
        )}
      </ul>
    </div>
  );
}
