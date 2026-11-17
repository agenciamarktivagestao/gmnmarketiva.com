import Link from "next/link";
import type { Metadata } from "next";
import { FormLogin } from "@/components/FormLogin";
import { modoDemonstracao } from "@/lib/ambiente";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<{ confirmado?: string }> }) {
  const { confirmado } = await searchParams;
  const demo = modoDemonstracao();
  return (
    <main className="login">
      <div className="login-marca">
        <p className="marca">
          Marktiva <span>Perfis</span>
        </p>
        <p className="login-frase">Todos os perfis do Google dos clientes, o que falta em cada um e o que a rotina da madrugada já fez.</p>
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
