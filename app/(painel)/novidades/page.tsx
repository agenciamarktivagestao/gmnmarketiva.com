import type { Metadata } from "next";
import { Novidades } from "@/components/Novidades";
import { lerVistoAte, listarMudancas, usuarioAtual } from "@/lib/dados";

export const metadata: Metadata = { title: "Novidades" };

export default async function PaginaNovidades() {
  const usuario = await usuarioAtual();
  const [mudancas, vistoAte] = await Promise.all([listarMudancas(), usuario ? lerVistoAte(usuario.email) : Promise.resolve(null)]);

  return (
    <>
      <section className="abertura">
        <h1>Novidades</h1>
        <p className="lead">
          O que foi ajustado no painel, nos dados e nas rotinas, com a data, como conferir e o que ainda falta. Do mais recente para o mais antigo.
        </p>
      </section>
      <Novidades mudancas={mudancas} vistoAte={vistoAte} />
    </>
  );
}
