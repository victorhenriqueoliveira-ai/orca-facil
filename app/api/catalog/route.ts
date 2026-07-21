import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

/**
 * GET /api/catalog
 * Lista itens do catálogo do usuário autenticado.
 * Por padrão retorna apenas itens ativos.
 * Com ?include_inactive=true retorna todos os itens.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includeInactive =
    request.nextUrl.searchParams.get("include_inactive") === "true";

  let query = supabase
    .from("catalog_items")
    .select("*")
    .eq("user_id", user.id);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/catalog
 * Cria um novo item no catálogo.
 * Requer subscription ativa (não read_only).
 * Valida: type in ['material','service'], unit_price >= 0.
 */
export async function POST(request: NextRequest) {
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
      { error: "Subscription required to create catalog items" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, type, unit, unit_price } = body as Record<string, unknown>;

  // Validações
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (type !== "material" && type !== "service") {
    return NextResponse.json(
      { error: "type must be 'material' or 'service'" },
      { status: 400 }
    );
  }

  if (typeof unit_price !== "number" || unit_price < 0) {
    return NextResponse.json(
      { error: "unit_price must be a number >= 0" },
      { status: 400 }
    );
  }

  const unitValue = typeof unit === "string" && unit.trim() !== "" ? unit.trim() : "un";

  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      user_id: user.id,
      name: (name as string).trim(),
      type,
      unit: unitValue,
      unit_price,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
