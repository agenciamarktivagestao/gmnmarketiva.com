import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { sair } from "@/app/actions";
import { modoDemonstracao } from "@/lib/ambiente";
import { usuarioAtual } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  if (!usuario.papel) {
    return (
      <main className="bloqueio">
        <h1>O seu e-mail ainda não está na equipe</h1>
        <p>
          Você entrou como <strong>{usuario.email}</strong>, mas este e-mail não foi liberado. Peça a um administrador para
          incluí-lo em Equipe e entre de novo.
        </p>
        <form action={sair}>
          <button className="btn btn-primario" type="submit">
            Sair
          </button>
        </form>
      </main>
    );
  }

  return (
    <>
      {modoDemonstracao() && (
        <p className="faixa-demo">
          Modo demonstração: dados de 16/11/2026, sem login. As decisões não são salvas até conectar o Supabase.
        </p>
      )}
      <header className="topo">
        <Link href="/" className="topo-logo" aria-label="Marktiva Perfis, ir ao painel">
          <Logo altura={24} />
          <span className="topo-nome" aria-hidden="true">
            Perfis
          </span>
        </Link>
        <NavLinks />
        <div className="topo-usuario">
          <span title={usuario.email}>{usuario.email.split("@")[0]}</span>
          {!modoDemonstracao() && (
            <form action={sair}>
              <button type="submit" className="btn btn-discreto">
                Sair
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="pagina">{children}</main>
    </>
  );
}
