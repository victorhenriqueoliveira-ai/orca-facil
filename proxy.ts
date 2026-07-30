import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Rotas públicas que não exigem autenticação
const ROTAS_PUBLICAS = [
  "/",
  "/login",
  "/cadastro",
  "/redefinir-senha",
  "/nova-senha",
  "/auth/verify",
  "/api/auth/callback",
  "/api/auth/logout",
  "/o",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deixar rotas públicas passarem sem verificação
  const ehRotaPublica = ROTAS_PUBLICAS.some((rota) => {
    if (rota === "/") return pathname === "/";
    return pathname === rota || pathname.startsWith(`${rota}/`);
  });

  if (ehRotaPublica) {
    return NextResponse.next();
  }

  // Criar resposta base para poder manipular cookies
  let resposta = NextResponse.next({
    request,
  });

  // Criar client Supabase com suporte a cookies de servidor
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          resposta = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verificar sessão do usuário (atualiza tokens automaticamente)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se não há sessão ativa, redirecionar para /login
  if (!user) {
    const urlLogin = new URL("/login", request.url);
    return NextResponse.redirect(urlLogin);
  }

  return resposta;
}

export const config = {
  matcher: [
    /*
     * Corresponde a todas as requisições exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone do site)
     * - Arquivos estáticos públicos (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
