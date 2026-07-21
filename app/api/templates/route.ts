import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/templates
 * Retorna todos os templates do sistema com seus itens.
 * Usuário deve estar autenticado.
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { data: templates, error } = await supabase
    .from("system_templates")
    .select("id, name, system_template_items(id, name, type, unit, position)")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Normalizar para o formato esperado pelo cliente
  const result = (templates ?? []).map((t: {
    id: string;
    name: string;
    system_template_items: Array<{ id: string; name: string; type: string; unit: string; position: number }>;
  }) => ({
    id: t.id,
    name: t.name,
    items: (t.system_template_items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      unit: item.unit,
      position: item.position,
    })),
  }));

  return NextResponse.json(result);
}
