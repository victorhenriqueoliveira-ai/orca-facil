import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

/**
 * POST /api/quotes
 * Cria um novo orçamento com a primeira versão.
 * Chama next_quote_number(user_id) para gerar número sequencial.
 * Guard: 403 se subscription read_only ou cancelled.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const subscription = await getSubscriptionStatus(user.id);
  if (subscription.status === "read_only" || subscription.status === "cancelled") {
    return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body pode ser vazio — ok
  }

  const customer_id = body.customer_id ?? null;
  const title = typeof body.title === "string" ? body.title.trim() || null : null;

  // Chamar função Postgres para obter o próximo número sequencial
  const { data: quoteNumberData, error: quoteNumberError } = await supabase.rpc(
    "next_quote_number",
    { p_user_id: user.id }
  );

  if (quoteNumberError) {
    return NextResponse.json({ error: quoteNumberError.message }, { status: 500 });
  }

  const quoteNumber = quoteNumberData as number;

  // Criar o orçamento
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      user_id: user.id,
      customer_id: customer_id || null,
      quote_number: quoteNumber,
      title,
      status: "draft",
    })
    .select("id, quote_number")
    .single();

  if (quoteError) {
    return NextResponse.json({ error: quoteError.message }, { status: 500 });
  }

  // Criar a primeira versão do orçamento
  const { data: version, error: versionError } = await supabase
    .from("quote_versions")
    .insert({
      quote_id: quote.id,
      version_number: 1,
    })
    .select("id")
    .single();

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      quote_id: quote.id,
      version_id: version.id,
      quote_number: quote.quote_number,
    },
    { status: 201 }
  );
}
