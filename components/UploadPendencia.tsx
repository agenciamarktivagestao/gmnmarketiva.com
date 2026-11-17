"use client";

import { useEffect, useId, useRef, useState } from "react";
import { registrarMidia, responder } from "@/app/actions";
import { chavesSupabase } from "@/lib/ambiente";
import { analisarCapa, prepararImagem, tamanho, type AnaliseCapa } from "@/lib/imagem";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import type { Pendencia, PayloadUpload } from "@/lib/tipos";

type Foto = {
  id: string;
  nome: string;
  blob: Blob;
  largura: number;
  altura: number;
  previa: string;
  categoria: "ADDITIONAL" | "COVER";
  analise: AnaliseCapa | null; // só para capa
  erro?: string;
};

// Área de envio de fotos dentro da pendência: confere o formato antes de enviar e,
// quando as fotos entram na fila, fecha a pendência para a rotina subir no Google.
export function UploadPendencia({ p, payload }: { p: Pendencia; payload: Record<string, unknown> }) {
  const cfg = payload as PayloadUpload;
  const soCapa = cfg.categoria === "COVER";
  const varias = !soCapa && cfg.varias !== false;
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const previas = useRef<string[]>([]);
  const idsEnviados = useRef<string[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [lendo, setLendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const chaves = chavesSupabase();

  useEffect(() => {
    const abertas = previas.current;
    return () => abertas.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const analisar = (categoria: Foto["categoria"], largura: number, altura: number) => (categoria === "COVER" ? analisarCapa(largura, altura) : null);

  const escolher = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setMensagem(null);
    setLendo(true);
    const novas: Foto[] = [];
    for (const arquivo of Array.from(lista).slice(0, varias ? 12 : 1)) {
      try {
        const { blob, largura, altura } = await prepararImagem(arquivo);
        const previa = URL.createObjectURL(blob);
        previas.current.push(previa);
        const categoria: Foto["categoria"] = soCapa ? "COVER" : "ADDITIONAL";
        novas.push({ id: crypto.randomUUID(), nome: arquivo.name, blob, largura, altura, previa, categoria, analise: analisar(categoria, largura, altura) });
      } catch (e) {
        novas.push({
          id: crypto.randomUUID(),
          nome: arquivo.name,
          blob: new Blob(),
          largura: 0,
          altura: 0,
          previa: "",
          categoria: "ADDITIONAL",
          analise: null,
          erro: e instanceof Error ? e.message : "Não consegui abrir esta imagem.",
        });
      }
    }
    // Capa é uma foto só: a nova substitui a anterior
    setFotos((atual) => (varias ? [...atual, ...novas] : novas));
    setLendo(false);
    if (entrada.current) entrada.current.value = "";
  };

  const mudarCategoria = (fotoId: string, categoria: Foto["categoria"]) =>
    setFotos((l) => l.map((f) => (f.id === fotoId ? { ...f, categoria, analise: analisar(categoria, f.largura, f.altura) } : f)));
  const tirar = (fotoId: string) => setFotos((l) => l.filter((f) => f.id !== fotoId));

  const bloqueada = (f: Foto) => !!f.erro || f.analise?.nivel === "erro";
  const validas = fotos.filter((f) => !bloqueada(f));

  const enviar = async () => {
    if (!chaves || !p.cliente_id || !validas.length) return;
    setEnviando(true);
    setMensagem(null);
    const sb = supabaseNavegador(chaves.url, chaves.chave);
    const restantes: Foto[] = [];
    for (const f of fotos) {
      if (bloqueada(f)) {
        restantes.push(f);
        continue;
      }
      const caminho = `${p.cliente_id}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from("midias").upload(caminho, f.blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) {
        restantes.push({ ...f, erro: "Não foi possível enviar. Confira se você tem permissão de edição." });
        continue;
      }
      const url = sb.storage.from("midias").getPublicUrl(caminho).data.publicUrl;
      const r = await registrarMidia(p.cliente_id, {
        caminho,
        url,
        nome: f.nome,
        largura: f.largura,
        altura: f.altura,
        bytes: f.blob.size,
        categoria: f.categoria,
      });
      if (r.erro || !r.id) {
        await sb.storage.from("midias").remove([caminho]);
        restantes.push({ ...f, erro: r.erro ?? "Não foi possível registrar a imagem." });
        continue;
      }
      idsEnviados.current.push(r.id);
    }
    setFotos(restantes);
    if (restantes.length === 0 && idsEnviados.current.length) {
      const r = await responder(p.id, { tipo: "upload", midias: idsEnviados.current });
      if (r.erro) setMensagem(r.erro);
    } else if (restantes.length) {
      setMensagem("Algumas fotos não foram enviadas. Veja o motivo abaixo e tente de novo; as que já subiram ficam na fila.");
    }
    setEnviando(false);
  };

  return (
    <div className="decisao decisao-upload" aria-busy={enviando}>
      <p className="decisao-pergunta">
        {cfg.sugestao ?? (soCapa ? "Envie uma foto horizontal para a capa." : "Envie as fotos.")}{" "}
        {soCapa && <span className="decisao-dica">A capa precisa ser horizontal, de preferência 16:9.</span>}
      </p>

      <div
        className={arrastando ? "soltar soltar-ativo" : "soltar"}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          void escolher(e.dataTransfer.files);
        }}
      >
        <p>{varias ? "Arraste as fotos até aqui ou" : "Arraste a foto até aqui ou"}</p>
        <label className="btn btn-seletor" htmlFor={`${id}-arquivo`}>
          {lendo ? "Preparando…" : varias ? "Escolher fotos" : "Escolher foto"}
        </label>
        <input
          id={`${id}-arquivo`}
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          multiple={varias}
          disabled={lendo || enviando}
          onChange={(e) => void escolher(e.target.files)}
          className="sr-only"
        />
      </div>

      {fotos.length > 0 && (
        <ul className="midias midias-previa">
          {fotos.map((f) => (
            <li key={f.id} className="midia">
              {f.previa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={f.categoria === "COVER" ? "midia-img midia-capa" : "midia-img"} src={f.previa} alt={`Prévia de ${f.nome}`} />
              ) : null}
              <p className="midia-info">
                {f.nome} {f.largura ? `· ${f.largura}×${f.altura} · ${tamanho(f.blob.size)}` : ""}
              </p>
              {!soCapa && f.previa && (
                <>
                  <label className="sr-only" htmlFor={`${id}-${f.id}`}>
                    Onde usar {f.nome}
                  </label>
                  <select id={`${id}-${f.id}`} value={f.categoria} onChange={(e) => mudarCategoria(f.id, e.target.value as Foto["categoria"])}>
                    <option value="ADDITIONAL">Galeria do perfil</option>
                    <option value="COVER">Capa (foto horizontal)</option>
                  </select>
                </>
              )}
              {f.analise && (
                <p className={f.analise.nivel === "erro" ? "erro" : f.analise.nivel === "aviso" ? "contador contador-alerta" : "sucesso"} role={f.analise.nivel === "erro" ? "alert" : undefined}>
                  {f.analise.texto}
                </p>
              )}
              {!f.analise && f.largura > 0 && f.largura < 720 && <p className="contador contador-alerta">Imagem pequena: pode ficar sem nitidez.</p>}
              {f.erro && <p className="erro">{f.erro}</p>}
              <button type="button" className="btn btn-discreto" onClick={() => tirar(f.id)} disabled={enviando}>
                Tirar
              </button>
            </li>
          ))}
        </ul>
      )}

      {fotos.length > 0 && (
        <div>
          {!chaves && <p className="aviso">Modo demonstração: conecte o Supabase para enviar. A conferência do formato já funciona.</p>}
          <button type="button" className="btn btn-primario" disabled={enviando || !validas.length || !chaves} onClick={enviar}>
            {enviando
              ? "Enviando…"
              : validas.length
                ? `Enviar ${validas.length} ${validas.length === 1 ? "foto" : "fotos"} e fechar a pendência`
                : "Escolha uma foto válida para enviar"}
          </button>
        </div>
      )}
      {mensagem && (
        <p role="alert" className="erro">
          {mensagem}
        </p>
      )}
    </div>
  );
}
