import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

/**
 * PATCH /api/catalog/[id]
 * Atualiza parcialmente um item do catálogo.
 * Permite alternar is_active para inativar/reativar sem excluir.
 * Requer subscription ativa (não read_only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) {
    return NextResponse.json(
      { error: "Subscription required to update catalog items" },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates = body as Record<string, unknown>;

  // Validações dos campos opcionais
  if ("type" in updates && updates.type !== "material" && updates.type !== "service") {
    return NextResponse.json(
      { error: "type must be 'material' or 'service'" },
      { status: 400 }
    );
  }

  if (
    "unit_price" in updates &&
    (typeof updates.unit_price !== "number" || updates.unit_price < 0)
  ) {
    return NextResponse.json(
      { error: "unit_price must be a number >= 0" },
      { status: 400 }
    );
  }

  if ("name" in updates && (typeof updates.name !== "string" || updates.name.trim() === "")) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  // Campos permitidos para atualização parcial
  const allowedFields = ["name", "type", "unit", "unit_price", "is_active"];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      sanitized[key] = key === "name" ? (updates[key] as string).trim() : updates[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("catalog_items")
    .update(sanitized)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
