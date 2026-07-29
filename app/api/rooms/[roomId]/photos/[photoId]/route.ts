import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "quote-photos";

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
 * DELETE /api/rooms/[roomId]/photos/[photoId]
 * Remove o arquivo do Storage e deleta o registro em quote_room_photos.
 * Verifica que o ambiente pertence ao usuário autenticado.
 * Retorna { success: true }.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string; photoId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { roomId, photoId } = await params;

  const owned = await verifyRoomOwnership(supabase, roomId, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Ambiente não encontrado" }, { status: 403 });
  }

  // Buscar o registro da foto
  const { data: photo, error: fetchError } = await supabase
    .from("quote_room_photos")
    .select("id, image_url")
    .eq("id", photoId)
    .eq("room_id", roomId)
    .single();

  if (fetchError || !photo) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  }

  // Remover arquivo do Storage
  const serviceClient = createServiceClient();
  const { error: storageError } = await serviceClient.storage
    .from(BUCKET)
    .remove([photo.image_url]);

  if (storageError) {
    return NextResponse.json(
      { error: `Erro ao remover arquivo: ${storageError.message}` },
      { status: 500 }
    );
  }

  // Deletar registro do banco
  const { error: deleteError } = await supabase
    .from("quote_room_photos")
    .delete()
    .eq("id", photoId)
    .eq("room_id", roomId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Arquivo removido, mas falha ao deletar registro" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
