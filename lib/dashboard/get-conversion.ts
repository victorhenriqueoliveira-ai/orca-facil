import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversionMetrics {
  sent: number;
  approved: number;
  conversion_rate: number;
  avg_ticket: number;
  total_approved: number;
  period_start: string;
  period_end: string;
}

/**
 * Calcula métricas de conversão a partir dos dados brutos de orçamentos aprovados.
 * Separada para facilitar testes unitários.
 */
export function calcularMetricas(
  sent: number,
  approvedQuotes: Array<{ quote_versions: Array<{ quote_rooms: Array<{ quote_items: Array<{ unit_price: number; quantity: number }> }> }>  }>
): Omit<ConversionMetrics, "period_start" | "period_end"> {
  const approved = approvedQuotes.length;

  // Calcular total de cada orçamento aprovado usando a primeira versão (mais recente pelo sort_order)
  const totaisAprovados = approvedQuotes.map((q) => {
    const versions = q.quote_versions ?? [];
    if (versions.length === 0) return 0;
    const version = versions[0];
    const rooms = version.quote_rooms ?? [];
    let subtotal = 0;
    for (const room of rooms) {
      const items = room.quote_items ?? [];
      for (const item of items) {
        subtotal += (item.unit_price ?? 0) * (item.quantity ?? 0);
      }
    }
    return subtotal;
  });

  const total_approved = totaisAprovados.reduce((acc, v) => acc + v, 0);
  const avg_ticket = approved > 0 ? total_approved / approved : 0;
  const conversion_rate = sent > 0 ? (approved / sent) * 100 : 0;

  return {
    sent,
    approved,
    conversion_rate,
    avg_ticket,
    total_approved,
  };
}

export async function getConversionMetrics(
  supabase: SupabaseClient,
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<ConversionMetrics | null> {
  const sentRes = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["sent", "accepted", "rejected", "expired"])
    .gte("sent_at", periodStart)
    .lte("sent_at", periodEnd + "T23:59:59.999Z");

  if (sentRes.error) return null;

  const approvedRes = await supabase
    .from("quotes")
    .select(
      `id, quote_versions ( id, sort_order, quote_rooms ( id, quote_items ( unit_price, quantity ) ) )`
    )
    .eq("user_id", userId)
    .eq("status", "accepted")
    .gte("sent_at", periodStart)
    .lte("sent_at", periodEnd + "T23:59:59.999Z");

  if (approvedRes.error) return null;

  const sentCount = sentRes.count ?? 0;
  const approvedQuotes = (approvedRes.data ?? []) as Array<{
    quote_versions: Array<{
      quote_rooms: Array<{
        quote_items: Array<{ unit_price: number; quantity: number }>;
      }>;
    }>;
  }>;

  const metricas = calcularMetricas(sentCount, approvedQuotes);

  return {
    ...metricas,
    period_start: periodStart,
    period_end: periodEnd,
  };
}
