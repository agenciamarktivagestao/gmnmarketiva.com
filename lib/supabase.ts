import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { chavesSupabase } from "./ambiente";

export async function supabaseServidor() {
  const chaves = chavesSupabase();
  if (!chaves) throw new Error("Supabase não configurado");
  const jar = await cookies();
  return createServerClient(chaves.url, chaves.chave, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Em páginas (só leitura) o proxy já renova a sessão.
        }
      },
    },
  });
}

// Acesso sem login e sem cookies: é o que a página do link do cliente usa. Só enxerga o que o papel "anon" pode,
// e o banco só entrega a ele a função acompanhamento_cliente.
export function supabasePublico() {
  const chaves = chavesSupabase();
  if (!chaves) throw new Error("Supabase não configurado");
  return createServerClient(chaves.url, chaves.chave, { cookies: { getAll: () => [], setAll: () => {} } });
}
