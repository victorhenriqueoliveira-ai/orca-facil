import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotes/[id]/pdf/latest
 * Busca o PDF mais recente do orçamento e gera uma nova signed URL para o storage_path.
 * A URL salva em quote_pdfs pode ter expirado — sempre gera uma nova.
 * Guard: apenas o próprio usuário acessa.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: quoteId } = await params;

  // Verificar que o orçamento pertence ao usuário
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  }

  // Buscar o PDF mais recente
  const { data: latestPdf, error: pdfError } = await supabase
    .from("quote_pdfs")
    .select("id, storage_path, generated_at")
    .eq("quote_id", quoteId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (pdfError || !latestPdf) {
    return NextResponse.json({ error: "Nenhum PDF encontrado para este orçamento" }, { status: 404 });
  }

  // Gerar nova signed URL (a URL salva pode ter expirado)
  const serviceClient = createServiceClient();
  const { data: signedData, error: signedError } = await serviceClient.storage
    .from("pdfs")
    .createSignedUrl(latestPdf.storage_path, 60 * 60 * 24 * 7); // 7 dias

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: "Erro ao gerar URL do PDF" }, { status: 500 });
  }

  return NextResponse.json({
    signed_url: signedData.signedUrl,
    generated_at: latestPdf.generated_at,
  });
}
