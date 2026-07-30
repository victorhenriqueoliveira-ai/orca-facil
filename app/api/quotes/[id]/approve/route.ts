import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendQuoteApproved } from "@/lib/email/templates/quote-approved";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://orcafacil.com.br";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotes/[id]/approve
 * Aprova um orçamento via token público (sem autenticação de sessão).
 * Body: { token: string }
 * Respostas:
 *   200 { success: true }
 *   400 token ausente no body
 *   404 token não corresponde ao orçamento
 *   409 orçamento já aprovado ou link expirado
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: quoteId } = await params;

  // Validar body
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido ou ausente" }, { status: 400 });
  }

  const token = body.token;
  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json({ error: "token é obrigatório" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Buscar o orçamento pelo id E token (validação conjunta)
  const { data: quote, error: fetchError } = await serviceClient
    .from("quotes")
    .select("id, status, approval_token_expires_at, user_id, quote_number, customer_id")
    .eq("id", quoteId)
    .eq("approval_token", token)
    .single();

  if (fetchError || !quote) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  }

  // Verificar se já está aprovado
  if (quote.status === "accepted") {
    return NextResponse.json({ error: "Orçamento já aprovado" }, { status: 409 });
  }

  // Verificar se expirou ou foi cancelado
  const now = new Date();
  const expiresAt = quote.approval_token_expires_at
    ? new Date(quote.approval_token_expires_at as string)
    : null;

  if (
    quote.status === "expired" ||
    quote.status === "cancelled" ||
    (expiresAt !== null && expiresAt < now)
  ) {
    return NextResponse.json({ error: "Link de aprovação expirado" }, { status: 409 });
  }

  // Aprovar o orçamento
  const { error: updateError } = await serviceClient
    .from("quotes")
    .update({ status: "accepted" })
    .eq("id", quoteId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Enviar e-mail de notificação ao marceneiro (fire-and-forget — não bloqueia a resposta)
  void (async () => {
    try {
      // Buscar e-mail do marceneiro
      const { data: userData } = await serviceClient.auth.admin.getUserById(
        quote.user_id as string
      );
      const marceneiroEmail = userData?.user?.email;

      if (!marceneiroEmail) return;

      // Buscar dados adicionais para o e-mail
      const [profileResult, customerResult] = await Promise.all([
        serviceClient
          .from("profiles")
          .select("business_name")
          .eq("id", quote.user_id as string)
          .single(),
        quote.customer_id
          ? serviceClient
              .from("customers")
              .select("name")
              .eq("id", quote.customer_id as string)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      await sendQuoteApproved(marceneiroEmail, {
        business_name: (profileResult.data?.business_name as string | null) ?? null,
        quote_number: quote.quote_number as number,
        customer_name: (customerResult.data as { name?: string } | null)?.name ?? null,
        quote_url: `${APP_URL}/orcamentos/${quoteId}`,
      });
    } catch {
      // Ignorar erros de e-mail — aprovação já foi salva
    }
  })();

  return NextResponse.json({ success: true });
}
