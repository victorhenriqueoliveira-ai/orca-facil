import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REGIONAL_DEFAULTS } from "@/lib/catalog/regional-defaults";
import { extractUF } from "@/app/api/catalog/regional-suggestions/route";

/**
 * POST /api/catalog/regional-suggestions/import
 * Importa itens do catálogo regional para o catálogo pessoal do usuário.
 *
 * Body: { item_ids?: string[], all?: boolean }
 *   - all: true → importa todos os itens da UF do usuário
 *   - item_ids: importa apenas os itens com os nomes especificados
 *
 * Itens já existentes (mesmo nome) são ignorados sem erro.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { item_ids, all } = body as { item_ids?: string[]; all?: boolean };

  if (!all && (!Array.isArray(item_ids) || item_ids.length === 0)) {
    return NextResponse.json(
      { error: "Forneça item_ids ou all: true" },
      { status: 400 }
    );
  }

  // Busca perfil para obter UF
  const { data: profile } = await supabase
    .from("profiles")
    .select("city")
    .eq("id", user.id)
    .single();

  const uf = extractUF(profile?.city);
  const suggestions = uf ? (REGIONAL_DEFAULTS[uf] ?? []) : [];

  if (suggestions.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  // Filtra os itens a importar
  const itemsToImport = all
    ? suggestions
    : suggestions.filter((s) => item_ids!.includes(s.name));

  if (itemsToImport.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  // Busca itens existentes do usuário para verificar duplicatas por nome
  const { data: existingItems } = await supabase
    .from("catalog_items")
    .select("name")
    .eq("user_id", user.id);

  const existingNames = new Set(
    (existingItems ?? []).map((i: { name: string }) => i.name)
  );

  const newItems = itemsToImport.filter((item) => !existingNames.has(item.name));
  const skippedCount = itemsToImport.length - newItems.length;

  if (newItems.length === 0) {
    return NextResponse.json({ imported: 0, skipped: skippedCount });
  }

  const rows = newItems.map((item) => ({
    user_id: user.id,
    name: item.name,
    type: item.type,
    unit: item.unit,
    unit_price: item.unit_price,
    is_active: true,
  }));

  const { error } = await supabase.from("catalog_items").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: newItems.length, skipped: skippedCount });
}
