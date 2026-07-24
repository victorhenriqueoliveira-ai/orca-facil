import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("catalog_items")
    .select("id, name, type, unit, unit_price, is_active, image_url, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  // Gerar signed URL via service client (bypass RLS para storage)
  let imageSignedUrl: string | null = null;
  if (data.image_url) {
    const serviceClient = createServiceClient();
    const { data: signed } = await serviceClient.storage
      .from("catalog")
      .createSignedUrl(data.image_url, 3600);
    imageSignedUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ ...data, imageSignedUrl });
}

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) return NextResponse.json({ error: "Subscription required" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabase
    .from("catalog_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
