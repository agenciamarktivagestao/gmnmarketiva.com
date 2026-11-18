"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AbasCliente({ slug }: { slug: string }) {
  const atual = usePathname();
  const base = `/clientes/${slug}`;
  const abas = [
    { href: base, nome: "Visão geral" },
    { href: `${base}/semana`, nome: "Últimos 7 dias" },
    { href: `${base}/servicos`, nome: "Serviços" },
    { href: `${base}/imagens`, nome: "Imagens" },
    { href: `${base}/diretrizes`, nome: "Tom e diretrizes" },
    { href: `/conteudo?cliente=${slug}`, nome: "Conteúdo" },
  ];
  return (
    <nav aria-label="Seções do cliente" className="abas">
      {abas.map((a) => (
        <Link key={a.href} href={a.href} aria-current={atual === a.href ? "page" : undefined}>
          {a.nome}
        </Link>
      ))}
    </nav>
  );
}
