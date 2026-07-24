import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteDetailClient, { type QuoteDetail } from "./quote-detail-client";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(`
      id,
      quote_number,
      title,
      status,
      notes,
      show_margin_on_pdf,
      customers ( id, name, email, phone ),
      quote_versions (
        id,
        version_number,
        profit_margin_pct,
        quote_rooms (
          id,
          name,
          position,
          quote_items (
            id,
            name,
            type,
            unit,
            unit_price,
            quantity,
            position
          )
        )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !quote) notFound();

  type RawVersion = typeof quote.quote_versions[number];
  type RawRoom = RawVersion["quote_rooms"][number];

  const versions = (quote.quote_versions ?? []).map((v: RawVersion) => {
    const rooms = (v.quote_rooms ?? [])
      .sort((a: RawRoom, b: RawRoom) => (a.position ?? 0) - (b.position ?? 0))
      .map((r: RawRoom) => ({
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
          })),
      }));

    return {
      id: v.id,
      name: (v as Record<string, unknown>).name as string ?? "Padrão",
      profit_margin_pct: Number(v.profit_margin_pct ?? 0),
      rooms,
    };
  });

  const customer = quote.customers as unknown as { id: string; name: string; email: string | null; phone: string | null } | null;

  const initialQuote: QuoteDetail = {
    id: quote.id,
    quote_number: quote.quote_number,
    title: (quote.title as string | null) ?? null,
    status: quote.status as QuoteDetail["status"],
    notes: (quote.notes as string | null) ?? null,
    show_margin_on_pdf: (quote.show_margin_on_pdf as boolean) !== false,
    customer: customer
      ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
      : null,
    versions,
  };

  return <QuoteDetailClient initialQuote={initialQuote} quoteId={id} />;
}
