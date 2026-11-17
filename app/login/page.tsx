import Link from "next/link";
import type { Metadata } from "next";
import { FormLogin } from "@/components/FormLogin";
import { Logo } from "@/components/Logo";
import { modoDemonstracao } from "@/lib/ambiente";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<{ confirmado?: string }> }) {
  const { confirmado } = await searchParams;
  const demo = modoDemonstracao();
  return (
    <main className="login">
      <div className="login-marca">
        <Logo altura={56} />
        <p className="login-frase">
          Perfis do Google de todos os clientes: o que falta em cada um, o que a rotina da madrugada já fez e o que você aprova antes de ir ao ar.
        </p>
      </div>
      <div className="login-caixa">
        <FormLogin
          demonstracao={demo}
          aviso={confirmado ? "E-mail confirmado. Entre com o seu e-mail e a senha." : undefined}
        />
        {demo && (
          <Link href="/" className="btn btn-largo login-demo">
            Abrir o painel de demonstração
          </Link>
        )}
      </div>
    </main>
  );
}
