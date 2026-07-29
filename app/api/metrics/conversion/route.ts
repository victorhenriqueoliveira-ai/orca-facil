import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

/**
 * GET /api/metrics/conversion
 * Retorna métricas de conversão do marceneiro autenticado para o período informado.
 * Query params: period_start, period_end (ISO 8601). Default: mês atual.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Default: primeiro e último dia do mês atual
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const period_start = searchParams.get("period_start") ?? defaultStart;
  const period_end = searchParams.get("period_end") ?? defaultEnd;

  // Contar orçamentos enviados (status diferente de draft) no período
  const sentRes = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["sent", "accepted", "rejected", "expired"])
    .gte("sent_at", period_start)
    .lte("sent_at", period_end + "T23:59:59.999Z");

  if (sentRes.error) {
    return NextResponse.json({ error: sentRes.error.message }, { status: 500 });
  }

  // Buscar orçamentos aprovados com seus itens para calcular valor
  const approvedRes = await supabase
    .from("quotes")
    .select(
      `id, quote_versions ( id, sort_order, quote_rooms ( id, quote_items ( unit_price, quantity ) ) )`
    )
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .gte("sent_at", period_start)
    .lte("sent_at", period_end + "T23:59:59.999Z");

  if (approvedRes.error) {
    return NextResponse.json({ error: approvedRes.error.message }, { status: 500 });
  }

  const sentCount = sentRes.count ?? 0;
  const approvedQuotes = (approvedRes.data ?? []) as Array<{
    quote_versions: Array<{
      quote_rooms: Array<{
        quote_items: Array<{ unit_price: number; quantity: number }>;
      }>;
    }>;
  }>;

  const metricas = calcularMetricas(sentCount, approvedQuotes);

  return NextResponse.json({
    ...metricas,
    period_start,
    period_end,
  } satisfies ConversionMetrics);
}
