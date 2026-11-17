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
