import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

/**
 * GET /api/quotes
 * Lista orçamentos do usuário autenticado com filtros opcionais e paginação.
 * Params: ?status=&page=1&limit=20
 * Guard: permitido para read_only (apenas leitura).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") ?? null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  // Buscar total para paginação
  let countQuery = supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (statusFilter) {
    countQuery = countQuery.eq("status", statusFilter);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  // Buscar orçamentos com dados calculados
  let dataQuery = supabase
    .from("quotes")
    .select(
      `
      id,
      quote_number,
      title,
      status,
      created_at,
      customers ( id, name ),
      quote_versions (
        id,
        profit_margin_pct,
        quote_items:quote_rooms ( quote_items ( unit_price, quantity ) )
      ),
      quote_pdfs ( storage_path, generated_at )
    `
    )
    .eq("user_id", user.id);

  if (statusFilter) {
    dataQuery = dataQuery.eq("status", statusFilter);
  }

  const { data: rawQuotes, error: dataError } = await dataQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (dataError) {
    return NextResponse.json({ error: dataError.message }, { status: 500 });
  }

  // Transformar dados para o formato de resposta
  const quotes = (rawQuotes ?? []).map((q: Record<string, unknown>) => {
    // Calcular total com margem da última versão
    const versions = (q.quote_versions as Array<Record<string, unknown>>) ?? [];
    let total_with_margin = 0;

    if (versions.length > 0) {
      const version = versions[0] as Record<string, unknown>;
      const margin = ((version.profit_margin_pct as number) ?? 0) / 100;
      const rooms = (version.quote_items as Array<Record<string, unknown>>) ?? [];
      let subtotal = 0;
      for (const room of rooms) {
        const items = (room.quote_items as Array<Record<string, unknown>>) ?? [];
        for (const item of items) {
          subtotal += ((item.unit_price as number) ?? 0) * ((item.quantity as number) ?? 0);
        }
      }
      total_with_margin = subtotal * (1 + margin);
    }

    // PDF mais recente
    const pdfs = (q.quote_pdfs as Array<Record<string, unknown>>) ?? [];
    const latestPdf = pdfs.sort(
      (a, b) =>
        new Date(b.generated_at as string).getTime() -
        new Date(a.generated_at as string).getTime()
    )[0];

    const customer = q.customers as Record<string, unknown> | null;

    return {
      id: q.id,
      quote_number: q.quote_number,
      title: q.title ?? null,
      status: q.status,
      customer_name: customer ? (customer.name as string) : null,
      customer_id: customer ? (customer.id as string) : null,
      total_with_margin: Math.round(total_with_margin * 100) / 100,
      created_at: q.created_at,
      has_pdf: !!latestPdf,
    };
  });

  return NextResponse.json({
    quotes,
    total: count ?? 0,
    page,
    limit,
  });
}

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
