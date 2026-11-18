"use client";

// Abre a janela de impressão do navegador; de lá dá para imprimir ou escolher "Salvar como PDF"
export function BotaoImprimir() {
  return (
    <button type="button" className="btn btn-primario" onClick={() => window.print()}>
      Imprimir ou salvar em PDF
    </button>
  );
}
