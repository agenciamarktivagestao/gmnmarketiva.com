"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", nome: "Painel" },
  { href: "/pendencias", nome: "Pendências" },
  { href: "/avaliacoes-ruins", nome: "Avaliações ruins" },
  { href: "/conteudo", nome: "Conteúdo" },
  { href: "/diretrizes", nome: "Diretrizes" },
  { href: "/semana", nome: "Últimos 7 dias" },
  { href: "/desempenho", nome: "Desempenho" },
  { href: "/rotina", nome: "Rotina" },
  { href: "/historico", nome: "Histórico" },
  { href: "/equipe", nome: "Equipe" },
  { href: "/novidades", nome: "Novidades" },
];

export function NavLinks({ novidades = 0, avaliacoesRuins = 0 }: { novidades?: number; avaliacoesRuins?: number }) {
  const atual = usePathname();
  return (
    <nav aria-label="Principal" className="nav">
      {LINKS.map((l) => {
        const ativo = l.href === "/" ? atual === "/" || atual.startsWith("/clientes") : atual.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={ativo ? "page" : undefined}>
            {l.nome}
            {l.href === "/avaliacoes-ruins" && avaliacoesRuins > 0 && (
              <>
                <span className="nav-selo" aria-hidden="true">
                  {avaliacoesRuins}
                </span>
                <span className="sr-only"> ({avaliacoesRuins === 1 ? "1 espera decisão" : `${avaliacoesRuins} esperam decisão`})</span>
              </>
            )}
            {l.href === "/novidades" && novidades > 0 && (
              <>
                <span className="nav-selo" aria-hidden="true">
                  {novidades}
                </span>
                <span className="sr-only"> ({novidades === 1 ? "1 nova" : `${novidades} novas`})</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
