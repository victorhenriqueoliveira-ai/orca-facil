import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/profile/logo
 * Upload de logo no Storage bucket 'logos'.
 * Recebe multipart/form-data com campo 'logo' (arquivo de imagem).
 * Valida tipo (jpeg/png/webp) e tamanho (máx 5MB).
 * Usa service_role key para contornar RLS no Storage.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Guard de read_only
  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) {
    return NextResponse.json(
      { error: "Assinatura inativa. Acesso somente leitura." },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida: esperado multipart/form-data" },
      { status: 400 }
    );
  }

  const arquivo = formData.get("logo") as File | null;

  if (!arquivo) {
    return NextResponse.json(
      { error: "Campo 'logo' obrigatório no FormData" },
      { status: 400 }
    );
  }

  // Validar tipo de arquivo
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return NextResponse.json(
      {
        error: `Tipo de arquivo inválido. Aceitos: ${TIPOS_ACEITOS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Validar tamanho
  if (arquivo.size > TAMANHO_MAXIMO) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Tamanho máximo: 5MB" },
      { status: 413 }
    );
  }

  // Determinar extensão baseada no tipo MIME
  const extensoes: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extensoes[arquivo.type];
  const path = `${user.id}/logo.${ext}`;

  // Usar service_role para upload (contornar RLS do Storage)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const buffer = await arquivo.arrayBuffer();

  const { error: uploadError } = await serviceClient.storage
    .from("logos")
    .upload(path, buffer, {
      contentType: arquivo.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Erro ao fazer upload: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Atualizar logo_url no perfil via client anon (respeitando RLS de profiles)
  const { error: updateError } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, logo_url: path, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (updateError) {
    return NextResponse.json(
      { error: "Upload concluído, mas falha ao atualizar perfil" },
      { status: 500 }
    );
  }

  // Gerar signed URL para exibição (1 hora)
  const { data: signedData, error: signedError } = await serviceClient.storage
    .from("logos")
    .createSignedUrl(path, 3600);

  if (signedError || !signedData) {
    // Upload OK, mas signed URL falhou — retornar 200 sem URL
    return NextResponse.json({
      logo_url: path,
      logoSignedUrl: null,
    });
  }

  return NextResponse.json({
    logo_url: path,
    logoSignedUrl: signedData.signedUrl,
  });
}
