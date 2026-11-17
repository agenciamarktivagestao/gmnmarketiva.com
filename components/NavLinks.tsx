"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", nome: "Painel" },
  { href: "/pendencias", nome: "Pendências" },
  { href: "/conteudo", nome: "Conteúdo" },
  { href: "/diretrizes", nome: "Diretrizes" },
  { href: "/historico", nome: "Histórico" },
  { href: "/equipe", nome: "Equipe" },
];

export function NavLinks() {
  const atual = usePathname();
  return (
    <nav aria-label="Principal" className="nav">
      {LINKS.map((l) => {
        const ativo = l.href === "/" ? atual === "/" || atual.startsWith("/clientes") : atual.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={ativo ? "page" : undefined}>
            {l.nome}
          </Link>
        );
      })}
    </nav>
  );
}
