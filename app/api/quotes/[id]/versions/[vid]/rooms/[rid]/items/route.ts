import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string; vid: string; rid: string }>;
}

/**
 * POST /api/quotes/[id]/versions/[vid]/rooms/[rid]/items
 * Adiciona um item a um ambiente.
 * ADR-003: armazena snapshot de nome, tipo, unidade e preço.
 * Valida: unit_price >= 0, quantity > 0.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: quoteId, rid: roomId } = await params;

  // Verificar que o quote pertence ao usuário
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, user_id")
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

  const { catalog_item_id, name, type, unit, unit_price, quantity } = body;

  // Validações obrigatórias
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Campo 'name' é obrigatório" }, { status: 400 });
  }

  if (!type || typeof type !== "string" || type.trim() === "") {
    return NextResponse.json({ error: "Campo 'type' é obrigatório" }, { status: 400 });
  }

  if (!unit || typeof unit !== "string" || unit.trim() === "") {
    return NextResponse.json({ error: "Campo 'unit' é obrigatório" }, { status: 400 });
  }

  if (typeof unit_price !== "number" || unit_price < 0) {
    return NextResponse.json(
      { error: "unit_price deve ser um número >= 0" },
      { status: 400 }
    );
  }

  if (typeof quantity !== "number" || quantity <= 0) {
    return NextResponse.json(
      { error: "quantity deve ser um número > 0" },
      { status: 400 }
    );
  }

  // Se catalog_item_id fornecido, validar existência (mas usar snapshot do body — ADR-003)
  if (catalog_item_id && typeof catalog_item_id === "string") {
    const { data: catalogItem, error: catalogError } = await supabase
      .from("catalog_items")
      .select("id")
      .eq("id", catalog_item_id)
      .eq("user_id", user.id)
      .single();

    if (catalogError || !catalogItem) {
      return NextResponse.json({ error: "Item do catálogo não encontrado" }, { status: 404 });
    }
  }

  // Buscar itens existentes para definir posição
  const { data: existingItems } = await supabase
    .from("quote_items")
    .select("id")
    .eq("room_id", roomId);

  const count = existingItems?.length ?? 0;

  // Criar item com snapshot (ADR-003)
  const { data: item, error: itemError } = await supabase
    .from("quote_items")
    .insert({
      room_id: roomId,
      catalog_item_id: catalog_item_id || null,
      name: (name as string).trim(),
      type: (type as string).trim(),
      unit: (unit as string).trim(),
      unit_price,
      quantity,
      position: count ?? 0,
    })
    .select("id")
    .single();

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  return NextResponse.json({ item_id: item.id }, { status: 201 });
}
