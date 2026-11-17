// Preparação de imagens no navegador: abre JPG, PNG, WebP e HEIC, reduz para até 2000 px e salva como JPG.
// Só pode ser importado por componentes de cliente.

export async function prepararImagem(arquivo: File): Promise<{ blob: Blob; largura: number; altura: number }> {
  let origem: Blob = arquivo;
  const ehHeic = /heic|heif/i.test(arquivo.type) || /\.(heic|heif)$/i.test(arquivo.name);
  let imagem: ImageBitmap | null = null;
  try {
    imagem = await createImageBitmap(origem, { imageOrientation: "from-image" });
  } catch {
    imagem = null;
  }
  if (!imagem && ehHeic) {
    const { default: heic2any } = await import("heic2any");
    const convertido = await heic2any({ blob: arquivo, toType: "image/jpeg", quality: 0.9 });
    origem = Array.isArray(convertido) ? convertido[0] : convertido;
    imagem = await createImageBitmap(origem, { imageOrientation: "from-image" });
  }
  if (!imagem) throw new Error("Não consegui abrir esta imagem. Use JPG, PNG, WebP ou HEIC.");
  // Reduz para no máximo 2000 px no lado maior e salva como JPG: o Google aceita e o envio fica leve
  const maior = Math.max(imagem.width, imagem.height);
  const escala = maior > 2000 ? 2000 / maior : 1;
  const largura = Math.round(imagem.width * escala);
  const altura = Math.round(imagem.height * escala);
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("O navegador não conseguiu preparar a imagem.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();
  const blob = await new Promise<Blob>((ok, falha) =>
    tela.toBlob((b) => (b ? ok(b) : falha(new Error("Falha ao converter a imagem."))), "image/jpeg", 0.88),
  );
  return { blob, largura, altura };
}

export const tamanho = (bytes: number) => (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Proporção ideal da capa no Google: 16:9
export type AnaliseCapa = { nivel: "erro" | "aviso" | "ok"; texto: string };
export function analisarCapa(largura: number, altura: number): AnaliseCapa {
  if (!largura || !altura) return { nivel: "erro", texto: "Não consegui ler o tamanho da imagem." };
  if (largura <= altura) {
    return {
      nivel: "erro",
      texto: `Esta foto está em pé (${largura}×${altura}). A capa precisa ser horizontal, de preferência 16:9. Escolha outra foto.`,
    };
  }
  const razao = largura / altura;
  if (largura < 720) return { nivel: "aviso", texto: `Horizontal, mas pequena (${largura}×${altura}). Pode ficar sem nitidez no Google.` };
  if (razao < 1.6) {
    return { nivel: "aviso", texto: `Horizontal, mas mais quadrada que o ideal (${razao.toFixed(2).replace(".", ",")}:1; o ideal é 16:9, ou 1,78:1). O Google pode cortar o topo e a base.` };
  }
  if (razao > 1.95) {
    return { nivel: "aviso", texto: `Horizontal, mas mais larga que o ideal (${razao.toFixed(2).replace(".", ",")}:1; o ideal é 16:9, ou 1,78:1). O Google pode cortar as laterais.` };
  }
  return { nivel: "ok", texto: `Boa proporção para capa (${largura}×${altura}, perto de 16:9).` };
}
