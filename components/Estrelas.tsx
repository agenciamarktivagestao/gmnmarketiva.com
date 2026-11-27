// A nota em estrelas, com texto para quem usa leitor de tela. Nota 2 ou menos fica em preto para chamar a atenção sem depender só da cor.
export function Estrelas({ n }: { n: number }) {
  return (
    <span className={n <= 2 ? "estrelas estrelas-baixa" : "estrelas"} role="img" aria-label={`${n} de 5 estrelas`}>
      <span aria-hidden="true">
        {"★".repeat(n)}
        <span className="estrelas-vazias">{"★".repeat(5 - n)}</span>
      </span>
    </span>
  );
}
