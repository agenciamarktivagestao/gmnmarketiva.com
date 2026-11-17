import { NIVEL } from "@/lib/rotulos";
import type { Nivel } from "@/lib/tipos";

// Cheio = em ordem, meio = a rever, vazio = falta. A forma diz o mesmo que a cor.
export function Fase({ nivel }: { nivel: Nivel }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className={`fase fase-${nivel}`} role="img" aria-label={NIVEL[nivel]}>
      <circle cx="8" cy="8" r="6.2" className="fase-aro" />
      {nivel === "ok" && <circle cx="8" cy="8" r="6.2" className="fase-cheio" />}
      {nivel === "rever" && <path d="M8 1.8a6.2 6.2 0 0 0 0 12.4z" className="fase-cheio" />}
    </svg>
  );
}
