import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  // Validar que next é um path interno (começa com "/") para prevenir open redirect
  const redirectTo =
    nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_code`
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=invalid_code`
    );
  }

  // Autenticação bem-sucedida — redirecionar para next (ou dashboard como fallback)
  return NextResponse.redirect(`${origin}${redirectTo}`);
}
