import type { TipoConteudo } from "@/lib/tipos";

type Props = {
  tipo: TipoConteudo;
  cliente: string;
  categoria?: string | null;
  texto: string;
  imagemUrl?: string | null;
  avaliador?: string | null;
  estrelas?: number | null;
  avaliacao?: string | null;
};

function Estrelas({ n }: { n: number }) {
  return (
    <span className="previa-estrelas" role="img" aria-label={`${n} de 5 estrelas`}>
      {"★".repeat(n)}
      <span className="previa-estrelas-vazias">{"★".repeat(5 - n)}</span>
    </span>
  );
}

const inicial = (nome: string) => nome.replace(/[^\p{L}\p{N}]/gu, " ").trim().charAt(0).toUpperCase() || "?";

// Imita o jeito como o texto aparece no perfil do Google, para conferir antes de aprovar.
export function PreviaGoogle({ tipo, cliente, categoria, texto, imagemUrl, avaliador, estrelas, avaliacao }: Props) {
  const vazio = !texto.trim();
  if (tipo === "resposta") {
    return (
      <figure className="previa" aria-label="Prévia da resposta no Google">
        <figcaption className="previa-rotulo">Prévia da resposta no Google</figcaption>
        <div className="previa-avaliacao">
          <span className="previa-avatar previa-avatar-neutro" aria-hidden="true">
            {inicial(avaliador || "Cliente")}
          </span>
          <div>
            <p className="previa-nome">{avaliador || "Nome de quem avaliou"}</p>
            {estrelas ? <Estrelas n={estrelas} /> : null}
            {avaliacao ? <p className="previa-texto">{avaliacao}</p> : null}
          </div>
        </div>
        <div className="previa-resposta">
          <p className="previa-nome">Resposta do proprietário</p>
          <p className="previa-sub">{cliente}</p>
          <p className={`previa-texto${vazio ? " previa-vazio" : ""}`}>{vazio ? "O texto da resposta aparece aqui." : texto}</p>
        </div>
      </figure>
    );
  }
  return (
    <figure className="previa" aria-label="Prévia da postagem no Google">
      <figcaption className="previa-rotulo">Prévia da postagem no Google</figcaption>
      <div className="previa-topo">
        <span className="previa-avatar" aria-hidden="true">
          {inicial(cliente)}
        </span>
        <div>
          <p className="previa-nome">{cliente}</p>
          <p className="previa-sub">{categoria ? `${categoria} · agora` : "agora"}</p>
        </div>
      </div>
      {imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="previa-img" src={imagemUrl} alt="" loading="lazy" />
      )}
      <p className={`previa-texto${vazio ? " previa-vazio" : ""}`}>{vazio ? "O texto da postagem aparece aqui." : texto}</p>
      <span className="previa-botao" aria-hidden="true">
        Ligar
      </span>
    </figure>
  );
}
