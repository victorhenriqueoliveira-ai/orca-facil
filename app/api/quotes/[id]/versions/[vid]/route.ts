import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string; vid: string }>;
}

/**
 * PATCH /api/quotes/[id]/versions/[vid]
 * Renomeia (ou atualiza campos de) uma versão do orçamento.
 * Body: { name?: string, profit_margin_pct?: number, notes?: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 403 });
  }

  // Verificar que a versão pertence ao orçamento
  const { data: version, error: versionError } = await supabase
    .from("quote_versions")
    .select("id")
    .eq("id", versionId)
    .eq("quote_id", quoteId)
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || (body.name as string).trim() === "") {
      return NextResponse.json({ error: "Campo 'name' inválido" }, { status: 400 });
    }
    updates.name = (body.name as string).trim();
  }

  if (body.profit_margin_pct !== undefined) {
    updates.profit_margin_pct = body.profit_margin_pct;
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("quote_versions")
    .update(updates)
    .eq("id", versionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/quotes/[id]/versions/[vid]
 * Remove uma versão do orçamento.
 * Guard: retorna 409 se for a única versão restante.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 403 });
  }

  // Contar versões existentes no orçamento
  const { data: allVersions, error: countError } = await supabase
    .from("quote_versions")
    .select("id")
    .eq("quote_id", quoteId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  // Guard: mínimo de 1 versão
  if (!allVersions || allVersions.length <= 1) {
    return NextResponse.json(
      { error: "Deve existir ao menos uma versão" },
      { status: 409 }
    );
  }

  // Verificar que a versão alvo pertence ao orçamento
  const versionBelongs = allVersions.some((v) => v.id === versionId);
  if (!versionBelongs) {
    return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 });
  }

  // Deletar versão (cascade em rooms e items via FK ON DELETE CASCADE)
  const { error: deleteError } = await supabase
    .from("quote_versions")
    .delete()
    .eq("id", versionId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
