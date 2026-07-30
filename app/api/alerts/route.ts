import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Interface para cada alerta de orçamento.
 */
export interface QuoteAlert {
  quote_id: string;
  quote_number: number;
  customer_name: string | null;
  action_url: string;
  expires_at?: string;
}

/**
 * Interface do response do endpoint GET /api/alerts.
 */
export interface AlertsResponse {
  approved: QuoteAlert[];
  followup: QuoteAlert[];
  expiring: QuoteAlert[];
}

/**
 * GET /api/alerts
 * Retorna três categorias de alertas baseados no estado atual dos orçamentos:
 * - approved: orçamentos aceitos nas últimas 48h
 * - followup: orçamentos enviados aguardando follow-up (sent_at > followup_days atrás, sem notificação)
 * - expiring: orçamentos enviados vencendo em <= 3 dias, sem notificação de vencimento
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Buscar followup_days do perfil do usuário
  const { data: profile } = await supabase
    .from("profiles")
    .select("followup_days")
    .eq("id", user.id)
    .single();

  const followupDays = (profile as { followup_days?: number } | null)?.followup_days ?? 7;

  // Executar as três queries em paralelo
  const [approvedResult, followupResult, expiringResult] = await Promise.all([
    // 1. Orçamentos aceitos nas últimas 48h
    supabase
      .from("quotes")
      .select("id, quote_number, customers(name)")
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .gte("sent_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()),

    // 2. Orçamentos enviados aguardando follow-up
    supabase
      .from("quotes")
      .select("id, quote_number, customers(name)")
      .eq("user_id", user.id)
      .eq("status", "sent")
      .lt("sent_at", new Date(Date.now() - followupDays * 24 * 60 * 60 * 1000).toISOString())
      .is("followup_notified_at", null),

    // 3. Orçamentos enviados vencendo em <= 3 dias
    supabase
      .from("quotes")
      .select("id, quote_number, customers(name), approval_token_expires_at")
      .eq("user_id", user.id)
      .eq("status", "sent")
      .gte("approval_token_expires_at", new Date().toISOString())
      .lte(
        "approval_token_expires_at",
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      )
      .is("expiry_notified_at", null),
  ]);

  /**
   * Mapeia um registro de orçamento para QuoteAlert.
   */
  function mapToAlert(
    row: Record<string, unknown>,
    includeExpiry = false
  ): QuoteAlert {
    const customer = row.customers as { name: string } | null;
    const alert: QuoteAlert = {
      quote_id: row.id as string,
      quote_number: row.quote_number as number,
      customer_name: customer?.name ?? null,
      action_url: `/orcamentos/${row.id}`,
    };
    if (includeExpiry && row.approval_token_expires_at) {
      alert.expires_at = row.approval_token_expires_at as string;
    }
    return alert;
  }

  const approved: QuoteAlert[] = (approvedResult.data ?? []).map((row) =>
    mapToAlert(row as Record<string, unknown>)
  );

  const followup: QuoteAlert[] = (followupResult.data ?? []).map((row) =>
    mapToAlert(row as Record<string, unknown>)
  );

  const expiring: QuoteAlert[] = (expiringResult.data ?? []).map((row) =>
    mapToAlert(row as Record<string, unknown>, true)
  );

  const response: AlertsResponse = { approved, followup, expiring };

  return NextResponse.json(response);
}
