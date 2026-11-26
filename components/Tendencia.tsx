// Um traço pequeno com a evolução dia a dia, sem eixos. O rótulo diz em palavras o que o traço mostra.
// Dia sem número abre um buraco no traço (não vira zero).
export function Tendencia({ valores, rotulo, largura = 120, altura = 32 }: { valores: (number | null)[]; rotulo: string; largura?: number; altura?: number }) {
  const raio = 4;
  const folga = raio + 2; // o ponto final e o anel branco não podem ser cortados pela borda
  const numeros = valores.filter((v): v is number => v !== null);
  if (numeros.length < 2) return null;
  const max = Math.max(...numeros, 1);
  const passo = (largura - 2 * folga) / (valores.length - 1);
  const x = (i: number) => folga + i * passo;
  const y = (v: number) => altura - folga - (v / max) * (altura - 2 * folga);

  let tracado = "";
  let abre = true;
  valores.forEach((v, i) => {
    if (v === null) {
      abre = true;
      return;
    }
    tracado += `${abre ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    abre = false;
  });
  const ultimo = valores.length - 1 - [...valores].reverse().findIndex((v) => v !== null);

  return (
    <svg className="tendencia" width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={rotulo}>
      <path d={tracado} fill="none" stroke="var(--azul)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(ultimo)} cy={y(valores[ultimo] as number)} r={raio + 2} fill="var(--papel)" />
      <circle cx={x(ultimo)} cy={y(valores[ultimo] as number)} r={raio} fill="var(--azul)" />
    </svg>
  );
}
