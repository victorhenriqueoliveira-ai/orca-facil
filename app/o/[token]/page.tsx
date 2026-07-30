import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateTotal, formatBRL } from "@/lib/quotes/calculate";
import { ApproveButton } from "./approve-button";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://orcafacil.com.br";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ApprovalPage({ params }: PageProps) {
  const { token } = await params;

  const serviceClient = createServiceClient();

  const { data: quote, error } = await serviceClient
    .from("quotes")
    .select(
      `
      id, quote_number, status, approval_token_expires_at, notes,
      customers ( name, phone, email ),
      quote_versions (
        id, name, profit_margin_pct,
        quote_rooms ( id, name, position,
          quote_items ( unit_price, quantity )
        )
      ),
      profiles:user_id ( business_name, phone, logo_url )
    `
    )
    .eq("approval_token", token)
    .single();

  if (error || !quote) {
    notFound();
  }

  // Estado: token não encontrado já trata o notFound acima
  // Estado: expirado ou cancelado
  const now = new Date();
  const expiresAt = quote.approval_token_expires_at
    ? new Date(quote.approval_token_expires_at as string)
    : null;

  const isExpired =
    (expiresAt !== null && expiresAt < now) || quote.status === "expired" || quote.status === "cancelled";

  const isAccepted = quote.status === "accepted";

  // Logo: gerar signed URL do storage
  const profileRaw = quote.profiles as unknown as Record<string, unknown> | null;
  const logoUrl = profileRaw?.logo_url as string | null | undefined;
  let signedLogoUrl: string | null = null;
  if (logoUrl) {
    const { data: signed } = await serviceClient.storage
      .from("logos")
      .createSignedUrl(logoUrl, 3600);
    signedLogoUrl = signed?.signedUrl ?? null;
  }

  const businessName = (profileRaw?.business_name as string | null) ?? "Marcenaria";
  const businessPhone = (profileRaw?.phone as string | null) ?? null;

  const customerRaw = quote.customers as unknown as Record<string, unknown> | null;
  const customerName = (customerRaw?.name as string | null) ?? "Cliente";
  const customerPhone = (customerRaw?.phone as string | null) ?? null;

  // Calcular totais por versão
  type QuoteVersionRaw = {
    id: string;
    name: string | null;
    profit_margin_pct: number | null;
    quote_rooms: Array<{
      id: string;
      name: string;
      position: number | null;
      quote_items: Array<{ unit_price: number; quantity: number }>;
    }>;
  };

  const versionsRaw = (quote.quote_versions as QuoteVersionRaw[]) ?? [];

  const versionsData = versionsRaw.map((version) => {
    const rooms = (version.quote_rooms ?? [])
      .sort((a, b) => ((a.position ?? 0) - (b.position ?? 0)))
      .map((room) => ({
        id: room.id,
        name: room.name,
        items: (room.quote_items ?? []).map((item) => ({
          id: room.id + "_item",
          name: "",
          unit: "un",
          unit_price: item.unit_price ?? 0,
          quantity: item.quantity ?? 0,
        })),
      }));

    const marginPct = version.profit_margin_pct ?? 0;
    const totals = calculateTotal(rooms, marginPct);

    return {
      id: version.id,
      name: version.name ?? `Versão`,
      totals,
    };
  });

  // WhatsApp link
  const phoneForWa = customerPhone ?? businessPhone;
  const waPhone = phoneForWa ? phoneForWa.replace(/\D/g, "") : null;
  const waMessage = encodeURIComponent(
    `Olá! Recebi o orçamento #${quote.quote_number} e gostaria de tirar algumas dúvidas.`
  );
  const waLink = waPhone ? `https://wa.me/55${waPhone}?text=${waMessage}` : null;

  // Estado expirado
  if (isExpired) {
    return (
      <main className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E5DDD3] p-8 text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-semibold text-[#2B2621] mb-2">Link expirado</h1>
          <p className="text-[#4A3F38] text-sm leading-relaxed">
            Este link de aprovação não está mais disponível. Entre em contato com o marceneiro para obter um novo link.
          </p>
          {businessPhone && (
            <a
              href={`https://wa.me/55${businessPhone.replace(/\D/g, "")}`}
              className="mt-6 inline-block py-3 px-6 rounded-xl bg-[#25D366] text-white font-semibold text-sm"
            >
              Falar no WhatsApp
            </a>
          )}
        </div>
        <Footer />
      </main>
    );
  }

  // Estado já aprovado
  if (isAccepted) {
    return (
      <main className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E5DDD3] p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-semibold text-[#2B2621] mb-2">Orçamento já aprovado</h1>
          <p className="text-[#4A3F38] text-sm leading-relaxed">
            Você já aprovou o <strong>Orçamento #{quote.quote_number}</strong>. O marceneiro foi notificado e entrará em contato em breve.
          </p>
        </div>
        <Footer />
      </main>
    );
  }

  // Estado ativo
  const expiresAtFormatted = expiresAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(expiresAt)
    : null;

  return (
    <main className="min-h-screen bg-[#FAF7F2] p-4">
      <div className="w-full max-w-lg mx-auto space-y-4 pb-8">
        {/* Cabeçalho da marcenaria */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5DDD3] p-6 text-center">
          {signedLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedLogoUrl}
              alt={`Logo ${businessName}`}
              className="h-16 w-auto mx-auto mb-3 object-contain"
            />
          ) : (
            <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-[#2D5D5A] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {businessName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-lg font-semibold text-[#2B2621]">{businessName}</h1>
          <p className="text-[#9B8E87] text-sm">Orçamento #{quote.quote_number}</p>
          {expiresAtFormatted && (
            <p className="text-[#9B8E87] text-xs mt-1">Válido até {expiresAtFormatted}</p>
          )}
        </div>

        {/* Dados do cliente */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5DDD3] p-4">
          <p className="text-xs text-[#9B8E87] uppercase tracking-wide font-medium mb-1">Preparado para</p>
          <p className="text-[#2B2621] font-semibold">{customerName}</p>
        </div>

        {/* Versões e ambientes */}
        {versionsData.length > 0 && (
          <div className="space-y-3">
            {versionsData.map((version, idx) => (
              <div key={version.id} className="bg-white rounded-2xl shadow-sm border border-[#E5DDD3] overflow-hidden">
                <div className="bg-[#2D5D5A] px-4 py-3">
                  <h2 className="text-white font-semibold text-sm">
                    {versionsData.length > 1 ? `Opção ${idx + 1}: ${version.name}` : version.name}
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {version.totals.rooms.map((room) => (
                    <div key={room.roomId} className="flex justify-between items-center py-2 border-b border-[#F0EBE5] last:border-0">
                      <span className="text-[#4A3F38] text-sm">{room.roomName}</span>
                      <span className="text-[#2B2621] font-medium text-sm">{formatBRL(room.totalWithMargin)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[#2B2621] font-semibold">Total</span>
                    <span className="text-[#C2703A] font-bold text-lg">{formatBRL(version.totals.grandTotal)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Observações */}
        {quote.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5DDD3] p-4">
            <p className="text-xs text-[#9B8E87] uppercase tracking-wide font-medium mb-2">Observações</p>
            <p className="text-[#4A3F38] text-sm leading-relaxed">{quote.notes as string}</p>
          </div>
        )}

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block text-center py-4 px-6 rounded-xl border-2 border-[#25D366] text-[#25D366] font-semibold text-base"
          >
            Tenho dúvidas
          </a>
        )}

        <Footer />
      </div>

      {/* Botão de aprovação fixo no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5DDD3] p-4 shadow-lg">
        <ApproveButton quoteId={quote.id as string} token={token} />
      </div>

      {/* Espaço para o botão fixo não cobrir conteúdo */}
      <div className="h-24" />
    </main>
  );
}

function Footer() {
  return (
    <footer className="w-full text-center py-4">
      <a
        href={APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#9B8E87] text-xs"
      >
        Gerado com <span className="font-semibold text-[#2D5D5A]">Orça Fácil</span>
      </a>
    </footer>
  );
}
