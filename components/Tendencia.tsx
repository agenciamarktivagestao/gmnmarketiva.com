// Um traço pequeno com a evolução dia a dia, sem eixos. O rótulo diz em palavras o que o traço mostra.
// Dia sem número abre um buraco no traço (não vira zero).
// `preencher` pinta a área embaixo do traço; `cor` e `anel` deixam o traço legível sobre fundo escuro.
export function Tendencia({
  valores,
  rotulo,
  largura = 120,
  altura = 32,
  cor = "var(--azul)",
  anel = "var(--papel)",
  preencher = false,
}: {
  valores: (number | null)[];
  rotulo: string;
  largura?: number;
  altura?: number;
  cor?: string;
  anel?: string;
  preencher?: boolean;
}) {
  const raio = 4;
  const folga = raio + 2; // o ponto final e o anel não podem ser cortados pela borda
  const numeros = valores.filter((v): v is number => v !== null);
  if (numeros.length < 2) return null;
  const max = Math.max(...numeros, 1);
  const passo = (largura - 2 * folga) / (valores.length - 1);
  const x = (i: number) => folga + i * passo;
  const y = (v: number) => altura - folga - (v / max) * (altura - 2 * folga);
  const chao = altura - folga;

  let tracado = "";
  let area = "";
  let abre = true;
  let inicioDoTrecho = 0;
  let fim = -1;
  const fecharArea = () => {
    if (preencher && fim > inicioDoTrecho) area += `L${x(fim).toFixed(1)} ${chao}L${x(inicioDoTrecho).toFixed(1)} ${chao}Z`;
  };
  valores.forEach((v, i) => {
    if (v === null) {
      if (!abre) fecharArea();
      abre = true;
      return;
    }
    if (abre) inicioDoTrecho = i;
    const ponto = `${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    tracado += `${abre ? "M" : "L"}${ponto}`;
    area += `${abre ? "M" : "L"}${ponto}`;
    abre = false;
    fim = i;
  });
  if (!abre) fecharArea();
  const ultimo = valores.length - 1 - [...valores].reverse().findIndex((v) => v !== null);

  return (
    <svg className="tendencia" width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={rotulo}>
      {preencher && <path d={area} fill={cor} fillOpacity="0.16" stroke="none" />}
      <path d={tracado} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(ultimo)} cy={y(valores[ultimo] as number)} r={raio + 2} fill={anel} />
      <circle cx={x(ultimo)} cy={y(valores[ultimo] as number)} r={raio} fill={cor} />
    </svg>
  );
}
