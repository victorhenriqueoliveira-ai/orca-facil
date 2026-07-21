import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  // Fazer logout invalidando a sessão no Supabase
  await supabase.auth.signOut();

  // Redirecionar para a tela de login após logout
  return NextResponse.redirect(`${origin}/login`, { status: 302 });
}
