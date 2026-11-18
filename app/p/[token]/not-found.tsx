import { Logo } from "@/components/Logo";

// Serve para qualquer link que não abre: desativado, digitado errado ou inexistente. Não diz qual dos casos é.
export default function LinkNaoEncontrado() {
  return (
    <main className="publico publico-vazio">
      <div className="publico-logo">
        <Logo altura={26} />
      </div>
      <h1>Este link não está ativo</h1>
      <p>Ele pode ter sido desativado ou copiado com algum erro. Peça à Agência Marktiva o link atual do seu acompanhamento semanal.</p>
    </main>
  );
}
