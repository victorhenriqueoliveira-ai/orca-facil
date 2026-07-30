import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB — abaixo do limite de 4,5 MB da Vercel

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });

  const { id } = await params;

  // Verificar que o item pertence ao usuário
  const { data: item } = await supabase
    .from("catalog_items")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Esperado multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "Campo 'image' obrigatório" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo inválido. Aceitos: jpeg, png, webp" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo: 5MB" }, { status: 413 });
  }

  const exts: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const path = `${user.id}/${id}.${exts[file.type]}`;

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from("catalog")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("catalog_items")
    .update({ image_url: path })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Upload ok, mas falha ao salvar path" }, { status: 500 });
  }

  const { data: signed } = await serviceClient.storage
    .from("catalog")
    .createSignedUrl(path, 3600);

  return NextResponse.json({ image_url: path, imageSignedUrl: signed?.signedUrl ?? null });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });

  const { id } = await params;

  const { data: item } = await supabase
    .from("catalog_items")
    .select("id, image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  if (item.image_url) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await serviceClient.storage.from("catalog").remove([item.image_url]);
  }

  await supabase.from("catalog_items").update({ image_url: null }).eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
