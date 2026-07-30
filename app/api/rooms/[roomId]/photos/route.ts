import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS_PER_ROOM = 3;
const SIGNED_URL_EXPIRES_IN = 3600; // 1 hora
const BUCKET = "quote-photos";

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Verifica que roomId pertence ao usuário autenticado.
 * Retorna true se o room pertencer ao usuário, false caso contrário.
 */
async function verifyRoomOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("quote_rooms")
    .select(
      `id, quote_versions!inner(id, quotes!inner(id, user_id))`
    )
    .eq("id", roomId)
    .eq("quote_versions.quotes.user_id", userId)
    .single();

  return !!data;
}

/**
 * GET /api/rooms/[roomId]/photos
 * Retorna a lista de fotos do ambiente com URLs assinadas (1h), ordenadas por posição.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { roomId } = await params;

  const owned = await verifyRoomOwnership(supabase, roomId, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Ambiente não encontrado" }, { status: 403 });
  }

  const { data: photos, error: fetchError } = await supabase
    .from("quote_room_photos")
    .select("id, image_url, position")
    .eq("room_id", roomId)
    .order("position", { ascending: true });

  if (fetchError) {
    return NextResponse.json(
      { error: "Erro ao buscar fotos" },
      { status: 500 }
    );
  }

  const serviceClient = createServiceClient();

  const photosWithSignedUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: signed } = await serviceClient.storage
        .from(BUCKET)
        .createSignedUrl(photo.image_url, SIGNED_URL_EXPIRES_IN);

      return {
        id: photo.id,
        image_url: signed?.signedUrl ?? null,
        position: photo.position,
      };
    })
  );

  return NextResponse.json(photosWithSignedUrls);
}

/**
 * POST /api/rooms/[roomId]/photos
 * Faz upload de uma foto para o ambiente. Aceita multipart/form-data com campo `photo`.
 * Valida tipo (jpeg/png/webp), tamanho máximo (5MB) e limite de 3 fotos por ambiente.
 * Retorna { id, image_url: signedUrl, position } com status 201.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { roomId } = await params;

  const owned = await verifyRoomOwnership(supabase, roomId, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Ambiente não encontrado" }, { status: 403 });
  }

  // Verificar limite de fotos por ambiente
  const { count, error: countError } = await supabase
    .from("quote_room_photos")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (countError) {
    return NextResponse.json(
      { error: "Erro ao verificar limite de fotos" },
      { status: 500 }
    );
  }

  if ((count ?? 0) >= MAX_PHOTOS_PER_ROOM) {
    return NextResponse.json(
      { error: `Limite de ${MAX_PHOTOS_PER_ROOM} fotos por ambiente atingido` },
      { status: 422 }
    );
  }

  // Ler FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Esperado multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("photo") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Campo 'photo' obrigatório" }, { status: 400 });
  }

  // Validar tipo de arquivo
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo inválido. Aceitos: jpeg, png, webp" },
      { status: 422 }
    );
  }

  // Validar tamanho
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo: 5MB" },
      { status: 422 }
    );
  }

  const photoId = randomUUID();
  const ext = EXT_MAP[file.type];
  const storagePath = `${user.id}/${roomId}/${photoId}.${ext}`;

  const serviceClient = createServiceClient();
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Erro no upload: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Determinar posição (próxima disponível)
  const position = (count ?? 0) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("quote_room_photos")
    .insert({
      id: photoId,
      room_id: roomId,
      image_url: storagePath,
      position,
    })
    .select("id, image_url, position")
    .single();

  if (insertError || !inserted) {
    // Remover arquivo do storage se insert falhou
    await serviceClient.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "Erro ao salvar registro da foto" },
      { status: 500 }
    );
  }

  const { data: signed } = await serviceClient.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN);

  return NextResponse.json(
    {
      id: inserted.id,
      image_url: signed?.signedUrl ?? null,
      position: inserted.position,
    },
    { status: 201 }
  );
}
