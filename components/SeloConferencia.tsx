import { estadoConferencia } from "@/lib/conferencia";
import { dataCurta, hora } from "@/lib/rotulos";
import type { Evento } from "@/lib/tipos";

// Mostra se a ação já foi relida no Google. Quem não mexe no Google (decisão, análise) e quem falhou não ganha selo.
// O estado vai escrito no texto, não só na cor.
export function SeloConferencia({ e }: { e: Pick<Evento, "tipo" | "ok" | "conferido_em"> }) {
  const estado = estadoConferencia(e);
  if (!estado) return null;
  if (estado === "conferido") {
    const quando = e.conferido_em ? `${dataCurta(e.conferido_em)} às ${hora(e.conferido_em)}` : "";
    return (
      <span className="etiqueta etiqueta-conferido" title={`Relido no Google e confirmado em ${quando}`}>
        <span aria-hidden="true">✓ </span>Conferido no Google
      </span>
    );
  }
  return (
    <span className="etiqueta etiqueta-falta" title="Ainda não foi relido no Google">
      Falta conferir
    </span>
  );
}
