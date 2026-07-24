import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

interface RouteParams {
  params: Promise<{ id: string; vid: string; rid: string; iid: string }>;
}

/**
 * PATCH /api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]
 * Atualiza snapshot de um item do orçamento (ADR-003: não altera o catálogo).
 * Body: { unit_price?: number, quantity?: number }
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

  const { id: quoteId, iid: itemId } = await params;

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

  const { unit_price, quantity } = body;

  // Validações
  if (unit_price !== undefined && (typeof unit_price !== "number" || unit_price < 0)) {
    return NextResponse.json(
      { error: "unit_price deve ser um número >= 0" },
      { status: 400 }
    );
  }

  if (quantity !== undefined && (typeof quantity !== "number" || quantity <= 0)) {
    return NextResponse.json(
      { error: "quantity deve ser um número > 0" },
      { status: 400 }
    );
  }

  if (unit_price === undefined && quantity === undefined) {
    return NextResponse.json(
      { error: "Forneça pelo menos unit_price ou quantity para atualizar" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (unit_price !== undefined) updates.unit_price = unit_price;
  if (quantity !== undefined) updates.quantity = quantity;

  const { data: updatedItem, error: updateError } = await supabase
    .from("quote_items")
    .update(updates)
    .eq("id", itemId)
    .select("id, name, type, unit, unit_price, quantity, position")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updatedItem) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ item: updatedItem });
}

/**
 * DELETE /api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]
 * Remove um item do ambiente.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const subscription = await getSubscriptionStatus(user.id);
  if (subscription.status === "read_only" || subscription.status === "cancelled") {
    return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });
  }

  const { id: quoteId, iid: itemId } = await params;

  const { data: quote } = await supabase
    .from("quotes").select("id").eq("id", quoteId).eq("user_id", user.id).single();
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

  const { error } = await supabase.from("quote_items").delete().eq("id", itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
