import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotes/[id]/duplicate
 * Duplica um orçamento existente, clonando recursivamente:
 * quotes → quote_versions → quote_rooms → quote_items
 * O novo orçamento recebe novo quote_number e status = 'draft'.
 * Não copia quote_pdfs.
 * Guard: 403 se subscription read_only ou cancelled.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

  // Buscar orçamento original com toda a estrutura
  const { data: original, error: fetchError } = await supabase
    .from("quotes")
    .select(
      `
      id,
      customer_id,
      title,
      notes,
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

  if (fetchError || !original) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  }

  // Gerar novo número sequencial
  const { data: quoteNumberData, error: quoteNumberError } = await supabase.rpc(
    "next_quote_number",
    { p_user_id: user.id }
  );

  if (quoteNumberError) {
    return NextResponse.json({ error: quoteNumberError.message }, { status: 500 });
  }

  // Criar novo orçamento (cópia)
  const { data: newQuote, error: newQuoteError } = await supabase
    .from("quotes")
    .insert({
      user_id: user.id,
      customer_id: original.customer_id ?? null,
      quote_number: quoteNumberData as number,
      title: original.title ?? null,
      notes: original.notes ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (newQuoteError || !newQuote) {
    return NextResponse.json({ error: newQuoteError?.message ?? "Erro ao criar orçamento" }, { status: 500 });
  }

  // Clonar versões
  const versions = (original.quote_versions as Array<Record<string, unknown>>) ?? [];

  for (const version of versions) {
    const { data: newVersion, error: newVersionError } = await supabase
      .from("quote_versions")
      .insert({
        quote_id: newQuote.id,
        version_number: version.version_number as number,
        profit_margin_pct: (version.profit_margin_pct as number) ?? 0,
      })
      .select("id")
      .single();

    if (newVersionError || !newVersion) {
      return NextResponse.json(
        { error: newVersionError?.message ?? "Erro ao clonar versão" },
        { status: 500 }
      );
    }

    // Clonar ambientes (rooms)
    const rooms = (version.quote_rooms as Array<Record<string, unknown>>) ?? [];

    for (const room of rooms) {
      const { data: newRoom, error: newRoomError } = await supabase
        .from("quote_rooms")
        .insert({
          quote_version_id: newVersion.id,
          name: room.name as string,
          position: (room.position as number) ?? 0,
          template_id: (room.template_id as string) ?? null,
        })
        .select("id")
        .single();

      if (newRoomError || !newRoom) {
        return NextResponse.json(
          { error: newRoomError?.message ?? "Erro ao clonar ambiente" },
          { status: 500 }
        );
      }

      // Clonar itens
      const items = (room.quote_items as Array<Record<string, unknown>>) ?? [];

      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          quote_room_id: newRoom.id,
          name: item.name as string,
          type: item.type as string,
          unit: (item.unit as string) ?? null,
          unit_price: (item.unit_price as number) ?? 0,
          quantity: (item.quantity as number) ?? 1,
          position: (item.position as number) ?? 0,
          catalog_item_id: (item.catalog_item_id as string) ?? null,
        }));

        const { error: itemsError } = await supabase.from("quote_items").insert(itemsToInsert);

        if (itemsError) {
          return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ new_quote_id: newQuote.id }, { status: 201 });
}
