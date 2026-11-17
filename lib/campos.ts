import { CAMPOS } from "./rotulos";
import type { Diagnostico } from "./tipos";

export { camposDaPendencia } from "./campos-regras";

export const nomeDoCampo = (chave: string) => CAMPOS.find((c) => c.chave === chave)?.nome ?? chave;

// Um perfil tem problema quando algum campo está "a rever" ou "falta".
export const temProblema = (d: Diagnostico | undefined) =>
  CAMPOS.some((c) => {
    const nivel = d?.campos?.[c.chave]?.nivel;
    return nivel === "rever" || nivel === "falta";
  });
