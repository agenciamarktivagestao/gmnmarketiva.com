import { createBrowserClient } from "@supabase/ssr";

// Usado só para enviar imagens direto do navegador ao armazenamento (evita o limite de tamanho das ações do servidor).
export function supabaseNavegador(url: string, chave: string) {
  return createBrowserClient(url, chave);
}
