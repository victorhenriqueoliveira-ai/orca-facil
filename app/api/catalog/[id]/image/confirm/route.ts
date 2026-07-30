import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/catalog/[id]/image/confirm
 * Body: { path: string }
 * Chamado após o browser fazer upload direto para o Supabase Storage.
 * Valida posse do path, atualiza catalog_items.image_url e devolve signed read URL.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const { data: item } = await supabase
    .from("catalog_items")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  let body: { path?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { path } = body;

  // Garante que o path pertence ao usuário autenticado
  if (!path || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Path inválido" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("catalog_items")
    .update({ image_url: path })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Erro ao salvar imagem no banco" }, { status: 500 });
  }

  const serviceClient = createServiceClient();
  const { data: signed } = await serviceClient.storage
    .from("catalog")
    .createSignedUrl(path, 3600);

  return NextResponse.json({ image_url: path, imageSignedUrl: signed?.signedUrl ?? null });
}
