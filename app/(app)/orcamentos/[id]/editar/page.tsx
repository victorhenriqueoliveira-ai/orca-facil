import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditarOrcamentoPage from "./editar-client";

export default async function EditarOrcamentoServerPage({
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
      notes,
      customers ( id, name ),
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
            type: i.type ?? "material",
            unit: i.unit,
            unit_price: Number(i.unit_price),
            quantity: Number(i.quantity),
          })),
      }));

    return {
      id: v.id,
      version_number: (v as Record<string, unknown>).version_number as number ?? 1,
      profit_margin_pct: Number(v.profit_margin_pct ?? 0),
      rooms,
    };
  });

  const customer = quote.customers as unknown as { id: string; name: string } | null;

  const initialQuote = {
    id: quote.id,
    quote_number: quote.quote_number,
    title: (quote.title as string | null) ?? null,
    notes: (quote.notes as string | null) ?? null,
    customer: customer ? { id: customer.id, name: customer.name } : null,
    versions,
  };

  return <EditarOrcamentoPage quoteId={id} initialQuote={initialQuote} />;
}
