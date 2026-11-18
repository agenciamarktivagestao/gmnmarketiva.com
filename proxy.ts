import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { chavesSupabase } from "@/lib/ambiente";

// Renova a sessão do Supabase e manda quem não entrou para /login.
export async function proxy(request: NextRequest) {
  const chaves = chavesSupabase();
  if (!chaves) return NextResponse.next(); // modo demonstração

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(chaves.url, chaves.chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const rota = request.nextUrl.pathname;
  // /p/ é o link de acompanhamento do cliente: abre sem login, só com o token secreto
  const publica = rota.startsWith("/login") || rota.startsWith("/auth") || rota.startsWith("/p/");

  if (!data.user && !publica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  if (data.user && rota.startsWith("/login")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
