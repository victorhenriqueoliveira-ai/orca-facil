import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string; vid: string }>;
}

/**
 * POST /api/quotes/[id]/versions/[vid]/rooms
 * Cria um ambiente (room) para uma versão do orçamento.
 * Se template_id fornecido: pré-popula os itens do template com unit_price=0.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: quoteId, vid: versionId } = await params;

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

  const { name, template_id } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Campo 'name' é obrigatório" }, { status: 400 });
  }

  // Buscar ambientes existentes para definir posição
  const { data: existingRooms } = await supabase
    .from("quote_rooms")
    .select("id")
    .eq("version_id", versionId);

  const count = existingRooms?.length ?? 0;

  // Criar o ambiente
  const { data: room, error: roomError } = await supabase
    .from("quote_rooms")
    .insert({
      version_id: versionId,
      name: name.trim(),
      template_id: template_id || null,
      position: count ?? 0,
    })
    .select("id")
    .single();

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  let items: Array<{ id: string; name: string; type: string; unit: string; quantity: number; unit_price: number }> = [];

  // Se template_id fornecido, pré-popular itens do template em paralelo
  if (template_id && typeof template_id === "string") {
    const { data: templateItems, error: templateError } = await supabase
      .from("system_template_items")
      .select("id, name, type, unit, position")
      .eq("template_id", template_id)
      .order("position", { ascending: true });

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 500 });
    }

    if (templateItems && templateItems.length > 0) {
      // Criar todos os itens em paralelo (ADR-003: snapshot com unit_price=0)
      const itemInserts = templateItems.map((ti, idx) =>
        supabase
          .from("quote_items")
          .insert({
            room_id: room.id,
            catalog_item_id: null,
            name: ti.name,
            type: ti.type,
            unit: ti.unit,
            unit_price: 0,
            quantity: 1,
            position: ti.position ?? idx,
          })
          .select("id, name, type, unit, quantity, unit_price")
          .single()
      );

      const results = await Promise.all(itemInserts);
      items = results
        .filter((r) => !r.error && r.data)
        .map((r) => r.data as { id: string; name: string; type: string; unit: string; quantity: number; unit_price: number });
    }
  }

  return NextResponse.json({ room_id: room.id, items }, { status: 201 });
}
