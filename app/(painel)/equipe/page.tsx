import type { Metadata } from "next";
import { ListaEquipe } from "@/components/Equipe";
import { listarEquipe, usuarioAtual } from "@/lib/dados";

export const metadata: Metadata = { title: "Equipe" };

export default async function Equipe() {
  const [usuario, membros] = await Promise.all([usuarioAtual(), listarEquipe()]);
  return (
    <>
      <section className="abertura">
        <h1>Equipe</h1>
        <p className="lead">
          Só os e-mails desta lista enxergam os clientes e as pendências. Quem criar um acesso com outro e-mail não vê nada.
        </p>
      </section>
      <div className="estreita">
        <ListaEquipe membros={membros} souAdmin={usuario?.papel === "admin"} meuEmail={usuario?.email ?? ""} />
      </div>
    </>
  );
}
