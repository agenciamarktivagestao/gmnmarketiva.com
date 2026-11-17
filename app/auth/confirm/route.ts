import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase";

// Destino do link de confirmação enviado por e-mail
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const sb = await supabaseServidor();

  let ok = false;
  if (code) {
    ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash) {
    ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type: "email" })).error;
  }
  return NextResponse.redirect(`${origin}${ok ? "/" : "/login?confirmado=1"}`);
}
