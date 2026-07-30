import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConversionMetrics } from "@/lib/dashboard/get-conversion";

export { calcularMetricas, type ConversionMetrics } from "@/lib/dashboard/get-conversion";

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

  const metrics = await getConversionMetrics(supabase, user.id, period_start, period_end);

  if (!metrics) {
    return NextResponse.json({ error: "Erro ao calcular métricas" }, { status: 500 });
  }

  return NextResponse.json(metrics);
}
