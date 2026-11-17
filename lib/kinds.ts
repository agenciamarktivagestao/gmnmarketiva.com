import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Kind } from "./tipos";

type Entrada = { titulo: string; cliente?: string; quem?: string; demo?: boolean; kind: Kind; payload: Record<string, unknown> };

// Só o modo demonstração usa este arquivo: com o Supabase conectado, kind e payload vêm da própria pendência.
// É o mesmo mapeamento que supabase/backfill_kind.sql aplicou nas pendências reais.
const ler = cache((): Entrada[] => JSON.parse(readFileSync(path.join(process.cwd(), "data", "kinds.json"), "utf8")));

export function kindDemonstracao(titulo: string, quem: string, slug: string | null): { kind: Kind; payload: Record<string, unknown> } | null {
  const candidatas = ler().filter((e) => e.titulo === titulo && (!e.quem || e.quem === quem) && (!e.cliente || e.cliente === slug));
  // A mais específica ganha: exemplo só da demonstração, depois com cliente, depois com "quem", depois só o título
  const peso = (e: Entrada) => Number(!!e.demo) * 4 + Number(!!e.cliente) * 2 + Number(!!e.quem);
  const melhor = candidatas.sort((a, b) => peso(b) - peso(a))[0];
  return melhor ? { kind: melhor.kind, payload: melhor.payload } : null;
}
