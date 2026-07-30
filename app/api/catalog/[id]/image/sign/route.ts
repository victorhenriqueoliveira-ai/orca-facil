import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

const EXT_MAP: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

/**
 * GET /api/catalog/[id]/image/sign?ext=jpg
 * Gera uma signed upload URL do Supabase Storage.
 * O browser faz PUT direto nessa URL — o arquivo nunca passa pela Vercel.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });

  const { id } = await params;

  const { data: item } = await supabase
    .from("catalog_items")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  const rawExt = request.nextUrl.searchParams.get("ext")?.toLowerCase() ?? "jpg";
  const ext = EXT_MAP[rawExt];
  if (!ext) return NextResponse.json({ error: "Extensão inválida. Use: jpg, png ou webp" }, { status: 400 });

  const path = `${user.id}/${id}.${ext}`;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.storage
    .from("catalog")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "Erro ao gerar URL de upload" }, { status: 500 });
  }

  return NextResponse.json({ signed_url: data.signedUrl, path: data.path });
}
