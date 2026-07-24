import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { generatePdfHtml } from "@/lib/pdf/template";
import { generatePdfFromHtml } from "@/lib/pdf/generate";
import type { PdfMode, PdfQuoteData, PdfRoom, PdfVersion } from "@/lib/pdf/template";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotes/[id]/pdf
 * Body: { mode: 'summary' | 'detailed', version_ids: string[] }
 *
 * Fluxo:
 * 1. Verifica subscription (403 se read_only ou cancelled)
 * 2. Verifica que o quote pertence ao usuário
 * 3. Busca dados: quote + versions + rooms + items + cliente + perfil (logo_url)
 * 4. Gera signed URL da logo (1h — para Puppeteer)
 * 5. Renderiza HTML via lib/pdf/template.ts
 * 6. Gera PDF via lib/pdf/generate.ts (Puppeteer)
 * 7. Upload para bucket pdfs → path: {userId}/{quoteId}/{timestamp}.pdf
 * 8. Cria registro em quote_pdfs
 * 9. Retorna signed URL de 7 dias (604800s)
 * 10. Atualiza quotes.status = 'sent'
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Auth via user client
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Subscription guard
  const subscription = await getSubscriptionStatus(user.id);
  if (subscription.status === "read_only" || subscription.status === "cancelled") {
    return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });
  }

  const { id: quoteId } = await params;

  // Parse body
  let body: { mode?: string; version_ids?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // allow empty body — use defaults
  }

  const mode: PdfMode =
    body.mode === "summary" || body.mode === "detailed" ? body.mode : "summary";
  const requestedVersionIds: string[] = Array.isArray(body.version_ids) ? body.version_ids : [];

  // Fetch quote + customer + versions + rooms + items
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select(
      `
      id,
      quote_number,
      title,
      status,
      notes,
      validity_days,
      created_at,
      show_margin_on_pdf,
      user_id,
      customers ( id, name, phone, email, address ),
      quote_versions (
        id,
        name,
        profit_margin_pct,
        sort_order,
        quote_rooms (
          id,
          name,
          position,
          quote_items (
            id,
            name,
            unit,
            unit_price,
            quantity,
            position
          )
        )
      )
    `
    )
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  }

  // Validate that requested version_ids belong to this quote
  const allVersionIds = (quote.quote_versions ?? []).map(
    (v: { id: string }) => v.id
  );

  if (requestedVersionIds.length > 0) {
    const invalidIds = requestedVersionIds.filter((vid) => !allVersionIds.includes(vid));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "version_ids inválidos para este orçamento" },
        { status: 403 }
      );
    }
  }

  // Filter versions to those requested (or all if none specified)
  const selectedVersionIds =
    requestedVersionIds.length > 0 ? requestedVersionIds : allVersionIds;

  // Fetch profile (logo_url, pix, etc.)
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, city, phone, logo_url, pix_key, bank_info, quote_validity_days")
    .eq("id", user.id)
    .single();

  // Service client for storage operations (bypasses RLS)
  const serviceClient = createServiceClient();

  // Generate signed URL for logo (1h — for Puppeteer)
  let logoSignedUrl: string | null = null;
  if (profile?.logo_url) {
    const { data: logoUrlData } = await serviceClient.storage
      .from("logos")
      .createSignedUrl(profile.logo_url, 3600);
    logoSignedUrl = logoUrlData?.signedUrl ?? null;
  }

  // Build PdfQuoteData
  type RawVersion = {
    id: string;
    name: string;
    profit_margin_pct: number;
    sort_order: number;
    quote_rooms: Array<{
      id: string;
      name: string;
      position: number;
      quote_items: Array<{
        id: string;
        name: string;
        unit: string;
        unit_price: number;
        quantity: number;
        position: number;
      }>;
    }>;
  };

  type RawCustomer = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };

  const rawVersions = (quote.quote_versions ?? []) as RawVersion[];
  const rawCustomer = quote.customers as unknown as RawCustomer | null;

  // Collect all item IDs to optionally fetch their image_url (graceful — column may not exist yet)
  const allItemIds: string[] = [];
  for (const v of rawVersions) {
    for (const r of v.quote_rooms ?? []) {
      for (const i of r.quote_items ?? []) allItemIds.push(i.id);
    }
  }
  const itemImageUrls = new Map<string, string>();
  if (allItemIds.length > 0) {
    const { data: itemImgRows } = await serviceClient
      .from("quote_items")
      .select("id, image_url")
      .in("id", allItemIds)
      .not("image_url", "is", null);
    if (itemImgRows) {
      const paths = new Set<string>();
      for (const row of itemImgRows as Array<{ id: string; image_url: string | null }>) {
        if (row.image_url) paths.add(row.image_url);
      }
      await Promise.all(
        Array.from(paths).map(async (path) => {
          const { data } = await serviceClient.storage.from("catalog").createSignedUrl(path, 3600);
          if (data?.signedUrl) itemImageUrls.set(path, data.signedUrl);
        })
      );
      for (const row of itemImgRows as Array<{ id: string; image_url: string | null }>) {
        if (row.image_url && itemImageUrls.has(row.image_url)) {
          itemImageUrls.set(row.id, itemImageUrls.get(row.image_url)!);
        }
      }
    }
  }

  const versions: PdfVersion[] = rawVersions
    .filter((v: RawVersion) => selectedVersionIds.includes(v.id))
    .sort((a: RawVersion, b: RawVersion) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((v: RawVersion) => {
      const rooms: PdfRoom[] = (v.quote_rooms ?? [])
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((r) => ({
          id: r.id,
          name: r.name,
          items: (r.quote_items ?? [])
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((i) => ({
              id: i.id,
              name: i.name,
              unit: i.unit,
              unit_price: Number(i.unit_price),
              quantity: Number(i.quantity),
              imageUrl: itemImageUrls.get(i.id) ?? null,
            })),
        }));

      return {
        id: v.id,
        name: v.name ?? "Padrão",
        profit_margin_pct: Number(v.profit_margin_pct ?? 0),
        rooms,
      };
    });

  const validityDays =
    quote.validity_days ?? profile?.quote_validity_days ?? 30;

  const pdfData: PdfQuoteData = {
    quoteNumber: quote.quote_number,
    title: (quote.title as string | null) ?? null,
    createdAt: quote.created_at as string,
    validityDays,
    notes: quote.notes as string | null,
    showMarginOnPdf: (quote.show_margin_on_pdf as boolean) !== false,
    customer: rawCustomer
      ? {
          name: rawCustomer.name,
          phone: rawCustomer.phone,
          email: rawCustomer.email,
          address: rawCustomer.address,
        }
      : null,
    profile: {
      businessName: profile?.business_name ?? "Marcenaria",
      city: profile?.city ?? null,
      phone: profile?.phone ?? null,
      pixKey: profile?.pix_key ?? null,
      bankInfo: profile?.bank_info ?? null,
      logoUrl: logoSignedUrl,
    },
    versions,
  };

  // Generate HTML
  const html = generatePdfHtml(pdfData, mode);

  // Generate PDF buffer
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdfFromHtml(html);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Erro ao gerar PDF:", msg);
    return NextResponse.json({ error: "Erro ao gerar PDF", detail: msg }, { status: 500 });
  }

  // Upload to Supabase Storage (service role — bypasses RLS)
  const timestamp = Date.now();
  const storagePath = `${user.id}/${quoteId}/${timestamp}.pdf`;

  const { error: uploadError } = await serviceClient.storage
    .from("pdfs")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("Erro ao fazer upload do PDF:", uploadError);
    return NextResponse.json({ error: "Erro ao salvar PDF" }, { status: 500 });
  }

  // Create record in quote_pdfs
  const { error: insertError } = await serviceClient.from("quote_pdfs").insert({
    quote_id: quoteId,
    storage_path: storagePath,
    mode,
    version_ids: selectedVersionIds,
  });

  if (insertError) {
    console.error("Erro ao criar registro quote_pdfs:", insertError);
    // Non-fatal: continue to return signed URL
  }

  // Generate signed URL (7 days = 604800s)
  const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
    .from("pdfs")
    .createSignedUrl(storagePath, 604800);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "Erro ao gerar URL do PDF" }, { status: 500 });
  }

  // Update quotes.status = 'sent'
  await serviceClient
    .from("quotes")
    .update({ status: "sent" })
    .eq("id", quoteId);

  return NextResponse.json({ signed_url: signedUrlData.signedUrl });
}
