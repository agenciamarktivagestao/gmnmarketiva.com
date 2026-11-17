"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { registrarMidia, retirarMidia } from "@/app/actions";
import { prepararImagem, tamanho } from "@/lib/imagem";
import { dataCurta } from "@/lib/rotulos";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import type { Cliente, Midia } from "@/lib/tipos";

type Preparada = {
  id: string;
  nome: string;
  blob: Blob;
  largura: number;
  altura: number;
  previa: string;
  categoria: "ADDITIONAL" | "COVER";
  erro?: string;
};


function CartaoMidia({ m, podeEditar }: { m: Midia; podeEditar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const capa = m.categoria === "COVER";
  return (
    <li className="midia" aria-busy={pendente}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={capa ? "midia-img midia-capa" : "midia-img"} src={m.url} alt={m.nome_original ?? "Imagem do cliente"} loading="lazy" />
      <p className="pend-meta">
        <span className="etiqueta">{capa ? "Capa" : "Galeria"}</span>
        {m.status === "na_fila" ? (
          <span className="etiqueta etiqueta-media">Na fila, vai na próxima rodada</span>
        ) : (
          <span className="etiqueta etiqueta-concluida">Enviada{m.enviada_em ? ` em ${dataCurta(m.enviada_em)}` : ""}</span>
        )}
      </p>
      <p className="midia-info">
        {m.largura && m.altura ? `${m.largura}×${m.altura}` : ""} {m.bytes ? `· ${tamanho(m.bytes)}` : ""}
      </p>
      {podeEditar && m.status === "na_fila" && (
        <button
          type="button"
          className="btn btn-discreto"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await retirarMidia(m.id);
              setErro(r.erro ?? null);
            })
          }
        >
          Retirar da fila
        </button>
      )}
      {erro && (
        <p role="alert" className="erro">
          {erro}
        </p>
      )}
    </li>
  );
}

export function GaleriaImagens({
  cliente,
  midias,
  podeEditar,
  supabaseUrl,
  supabaseChave,
}: {
  cliente: Cliente;
  midias: Midia[];
  podeEditar: boolean;
  supabaseUrl: string | null;
  supabaseChave: string | null;
}) {
  const [preparadas, setPreparadas] = useState<Preparada[]>([]);
  const [lendo, setLendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const previasAbertas = useRef<string[]>([]);

  useEffect(() => {
    const abertas = previasAbertas.current;
    return () => abertas.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const escolher = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setMensagem(null);
    setLendo(true);
    const novas: Preparada[] = [];
    for (const arquivo of Array.from(lista).slice(0, 12)) {
      try {
        const { blob, largura, altura } = await prepararImagem(arquivo);
        const previa = URL.createObjectURL(blob);
        previasAbertas.current.push(previa);
        novas.push({ id: crypto.randomUUID(), nome: arquivo.name, blob, largura, altura, previa, categoria: "ADDITIONAL" });
      } catch (e) {
        novas.push({
          id: crypto.randomUUID(),
          nome: arquivo.name,
          blob: new Blob(),
          largura: 0,
          altura: 0,
          previa: "",
          categoria: "ADDITIONAL",
          erro: e instanceof Error ? e.message : "Não consegui abrir esta imagem.",
        });
      }
    }
    setPreparadas((atual) => [...atual, ...novas]);
    setLendo(false);
    if (entrada.current) entrada.current.value = "";
  };

  const enviar = async () => {
    if (!supabaseUrl || !supabaseChave) return;
    const validas = preparadas.filter((p) => !p.erro);
    if (!validas.length) return;
    setEnviando(true);
    setMensagem(null);
    const sb = supabaseNavegador(supabaseUrl, supabaseChave);
    const restantes: Preparada[] = [];
    let enviadas = 0;
    for (const p of preparadas) {
      if (p.erro) continue;
      const caminho = `${cliente.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from("midias").upload(caminho, p.blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) {
        restantes.push({ ...p, erro: "Não foi possível enviar. Confira se você tem permissão de edição." });
        continue;
      }
      const url = sb.storage.from("midias").getPublicUrl(caminho).data.publicUrl;
      const r = await registrarMidia(cliente.id, {
        caminho,
        url,
        nome: p.nome,
        largura: p.largura,
        altura: p.altura,
        bytes: p.blob.size,
        categoria: p.categoria,
      });
      if (r.erro) {
        await sb.storage.from("midias").remove([caminho]);
        restantes.push({ ...p, erro: r.erro });
        continue;
      }
      enviadas += 1;
    }
    setPreparadas(restantes);
    setEnviando(false);
    setMensagem(
      restantes.length
        ? { tipo: "erro", texto: `${enviadas} na fila. ${restantes.length} não foram enviadas; veja o motivo abaixo.` }
        : { tipo: "ok", texto: `${enviadas} ${enviadas === 1 ? "imagem na fila" : "imagens na fila"}. A rotina sobe no Google na próxima rodada.` },
    );
  };

  const mudarCategoria = (id: string, categoria: "ADDITIONAL" | "COVER") =>
    setPreparadas((l) => l.map((p) => (p.id === id ? { ...p, categoria } : p)));
  const tirar = (id: string) => setPreparadas((l) => l.filter((p) => p.id !== id));

  const naFila = midias.filter((m) => m.status === "na_fila");
  const enviadas = midias.filter((m) => m.status === "enviada");

  return (
    <>
      {podeEditar && (
        <section className="envio" aria-labelledby="t-envio">
          <h2 id="t-envio">Incluir imagens</h2>
          {!supabaseUrl ? (
            <p className="aviso">Modo demonstração: conecte o Supabase para enviar imagens.</p>
          ) : (
            <>
              <p className="nota nota-curta">
                Escolha fotos do celular ou do computador (JPG, PNG, WebP ou HEIC). Elas são reduzidas e convertidas antes de enviar. Confira a prévia
                antes de colocar na fila.
              </p>
              <label className="btn btn-seletor">
                {lendo ? "Preparando…" : "Escolher imagens"}
                <input
                  ref={entrada}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  multiple
                  disabled={lendo || enviando}
                  onChange={(e) => escolher(e.target.files)}
                  className="sr-only"
                />
              </label>

              {preparadas.length > 0 && (
                <>
                  <ul className="midias midias-previa">
                    {preparadas.map((p) => {
                      const vertical = p.largura > 0 && p.largura <= p.altura;
                      const pequena = p.largura > 0 && p.largura < 720;
                      return (
                        <li key={p.id} className="midia">
                          {p.erro && !p.previa ? (
                            <p className="erro midia-erro">{p.erro}</p>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className={p.categoria === "COVER" ? "midia-img midia-capa" : "midia-img"} src={p.previa} alt={`Prévia de ${p.nome}`} />
                          )}
                          <p className="midia-info">
                            {p.nome} {p.largura ? `· ${p.largura}×${p.altura} · ${tamanho(p.blob.size)}` : ""}
                          </p>
                          {!p.erro || p.previa ? (
                            <>
                              <label className="sr-only" htmlFor={`cat-${p.id}`}>
                                Onde usar {p.nome}
                              </label>
                              <select id={`cat-${p.id}`} value={p.categoria} onChange={(e) => mudarCategoria(p.id, e.target.value as "ADDITIONAL" | "COVER")}>
                                <option value="ADDITIONAL">Galeria do perfil</option>
                                <option value="COVER" disabled={vertical}>
                                  Capa (foto horizontal)
                                </option>
                              </select>
                              {vertical && <p className="contador contador-alerta">Foto vertical: só serve para a galeria.</p>}
                              {pequena && <p className="contador contador-alerta">Imagem pequena: pode ficar sem nitidez.</p>}
                              {p.categoria === "COVER" && <p className="contador">A prévia mostra o corte horizontal da capa.</p>}
                            </>
                          ) : null}
                          {p.erro && p.previa && <p className="erro">{p.erro}</p>}
                          <button type="button" className="btn btn-discreto" onClick={() => tirar(p.id)} disabled={enviando}>
                            Tirar
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div>
                    <button type="button" className="btn btn-primario" disabled={enviando || preparadas.every((p) => p.erro)} onClick={enviar}>
                      {enviando ? "Enviando…" : `Colocar ${preparadas.filter((p) => !p.erro).length} na fila`}
                    </button>
                  </div>
                </>
              )}
              {mensagem && (
                <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={mensagem.tipo === "erro" ? "erro" : "sucesso"}>
                  {mensagem.texto}
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section className="bloco" aria-labelledby="t-fila-img">
        <h2 id="t-fila-img">
          Na fila para o Google <span className="grupo-n">{naFila.length}</span>
        </h2>
        {naFila.length === 0 ? (
          <p className="vazio">Nenhuma imagem esperando. A rotina sobe o que você colocar na fila.</p>
        ) : (
          <ul className="midias">
            {naFila.map((m) => (
              <CartaoMidia key={m.id} m={m} podeEditar={podeEditar} />
            ))}
          </ul>
        )}
      </section>

      {enviadas.length > 0 && (
        <section className="bloco" aria-labelledby="t-env-img">
          <h2 id="t-env-img">
            Já enviadas <span className="grupo-n">{enviadas.length}</span>
          </h2>
          <ul className="midias">
            {enviadas.map((m) => (
              <CartaoMidia key={m.id} m={m} podeEditar={podeEditar} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
