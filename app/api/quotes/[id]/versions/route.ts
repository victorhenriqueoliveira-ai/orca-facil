import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotes/[id]/versions
 * Cria uma nova versão (variante) para o orçamento.
 * Body: { name: string }
 * Retorna: { version_id, version_number }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: quoteId } = await params;

  // Verificar que o quote pertence ao usuário
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, user_id")
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Campo 'name' é obrigatório" }, { status: 400 });
  }

  // Buscar versões existentes para definir sort_order e version_number
  const { data: existingVersions } = await supabase
    .from("quote_versions")
    .select("id, sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const maxSortOrder = existingVersions?.[0]?.sort_order ?? 0;
  const versionCount = existingVersions?.length ?? 1;
  const nextVersionNumber = versionCount + 1;

  // Criar nova versão
  const { data: version, error: versionError } = await supabase
    .from("quote_versions")
    .insert({
      quote_id: quoteId,
      name: name.trim(),
      sort_order: maxSortOrder + 1,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: versionError?.message ?? "Erro ao criar versão" }, { status: 500 });
  }

  return NextResponse.json(
    { version_id: version.id, version_number: nextVersionNumber },
    { status: 201 }
  );
}
