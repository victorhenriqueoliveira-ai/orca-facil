import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://orcafacil.com.br";

/**
 * GET /api/quotes/[id]
 * Retorna orçamento completo: quote + versions + rooms + items.
 * Inclui approval_token, approval_link e sent_at quando status é 'sent' ou 'accepted'.
 * Guard: apenas o próprio usuário acessa.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: quoteId } = await params;

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select(
      `
      id,
      quote_number,
      title,
      status,
      notes,
      show_margin_on_pdf,
      customer_id,
      approval_token,
      approval_token_expires_at,
      sent_at,
      customers ( id, name, email, phone ),
      quote_versions (
        id,
        version_number,
        profit_margin_pct,
        quote_rooms (
          id,
          name,
          position,
          template_id,
          quote_items (
            id,
            name,
            type,
            unit,
            unit_price,
            quantity,
            position,
            catalog_item_id
          )
        )
      )
    `
    )
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  }

  // Ordenar rooms e items por position
  const versions = (quote.quote_versions ?? []).map((version: Record<string, unknown>) => {
    const rooms = ((version.quote_rooms as Array<Record<string, unknown>>) ?? [])
      .sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          ((a.position as number) ?? 0) - ((b.position as number) ?? 0)
      )
      .map((room: Record<string, unknown>) => ({
        ...room,
        items: ((room.quote_items as Array<Record<string, unknown>>) ?? []).sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            ((a.position as number) ?? 0) - ((b.position as number) ?? 0)
        ),
        quote_items: undefined,
      }));

    return {
      ...version,
      rooms,
      quote_rooms: undefined,
    };
  });

  // Incluir approval_link quando status é 'sent' ou 'accepted' e há token
  const quoteStatus = quote.status as string;
  const approvalToken = quote.approval_token as string | null | undefined;
  const approvalData =
    (quoteStatus === "sent" || quoteStatus === "accepted") && approvalToken
      ? {
          approval_token: approvalToken,
          approval_link: `${APP_URL}/o/${approvalToken}`,
          sent_at: quote.sent_at ?? null,
        }
      : {};

  return NextResponse.json({
    quote: {
      id: quote.id,
      quote_number: quote.quote_number,
      title: quote.title,
      status: quote.status,
      notes: quote.notes,
      show_margin_on_pdf: quote.show_margin_on_pdf !== false,
      customer: quote.customers ?? null,
      versions,
      ...approvalData,
    },
  });
}

/**
 * PATCH /api/quotes/[id]
 * Atualiza campos do cabeçalho do orçamento e/ou margem de lucro na versão.
 * Body: { profit_margin_pct?: number, title?: string, notes?: string, version_id?: string }
 * Guard: 403 se subscription read_only ou cancelled.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  const { id: quoteId } = await params;

  // Verificar que o quote pertence ao usuário
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, user_id, approval_token, created_at")
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { profit_margin_pct, title, notes, version_id, status, show_margin_on_pdf } = body;

  // Validar status se fornecido
  const validStatuses = ["draft", "sent", "accepted", "rejected", "expired"];
  if (status !== undefined && !validStatuses.includes(status as string)) {
    return NextResponse.json(
      { error: `status inválido. Valores permitidos: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  // Atualizar campos do quote (title, notes, status, show_margin_on_pdf)
  const quoteUpdates: Record<string, unknown> = {};
  if (typeof title === "string") quoteUpdates.title = title.trim() || null;
  if (typeof notes === "string") quoteUpdates.notes = notes.trim() || null;
  if (typeof status === "string") quoteUpdates.status = status;
  if (typeof show_margin_on_pdf === "boolean") quoteUpdates.show_margin_on_pdf = show_margin_on_pdf;

  if (Object.keys(quoteUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from("quotes")
      .update(quoteUpdates)
      .eq("id", quoteId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Gerar e persistir approval_token quando status muda para 'sent'
  let approvalToken: string | null = (quote.approval_token as string | null) ?? null;
  let approvalLink: string | null = null;

  if (status === "sent") {
    if (!approvalToken) {
      // Buscar validity_days do perfil do usuário (default 15 se null)
      const { data: profile } = await supabase
        .from("profiles")
        .select("quote_validity_days")
        .eq("user_id", user.id)
        .single();

      const validityDays = (profile?.quote_validity_days as number | null | undefined) ?? 15;

      const createdAt = new Date(quote.created_at as string);
      const expiresAt = new Date(createdAt.getTime() + validityDays * 24 * 60 * 60 * 1000);

      const newToken = crypto.randomUUID();

      // Usar WHERE approval_token IS NULL para prevenir race condition
      const { error: tokenError } = await supabase
        .from("quotes")
        .update({
          approval_token: newToken,
          approval_token_expires_at: expiresAt.toISOString(),
          sent_at: new Date().toISOString(),
        })
        .eq("id", quoteId)
        .is("approval_token", null);

      if (tokenError) {
        return NextResponse.json({ error: tokenError.message }, { status: 500 });
      }

      approvalToken = newToken;
    }

    approvalLink = `${APP_URL}/o/${approvalToken}`;
  }

  // Atualizar margem de lucro na versão
  if (typeof profit_margin_pct === "number") {
    if (profit_margin_pct < 0 || profit_margin_pct > 1000) {
      return NextResponse.json(
        { error: "profit_margin_pct deve estar entre 0 e 1000" },
        { status: 400 }
      );
    }

    // Identificar qual versão atualizar: usar version_id do body ou atualizar todas da quote
    let versionError: { message: string } | null = null;

    if (typeof version_id === "string") {
      const result = await supabase
        .from("quote_versions")
        .update({ profit_margin_pct })
        .eq("quote_id", quoteId)
        .eq("id", version_id);
      versionError = result.error;
    } else {
      const result = await supabase
        .from("quote_versions")
        .update({ profit_margin_pct })
        .eq("quote_id", quoteId);
      versionError = result.error;
    }

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 });
    }
  }

  const response: Record<string, unknown> = { success: true };
  if (status === "sent" && approvalToken) {
    response.approval_token = approvalToken;
    response.approval_link = approvalLink;
  }

  return NextResponse.json(response);
}

/**
 * DELETE /api/quotes/[id]
 * Exclui o orçamento e todos os dados relacionados (cascade).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

  const { id: quoteId } = await params;

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", quoteId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
