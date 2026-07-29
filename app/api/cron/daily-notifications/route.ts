import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendQuoteFollowup, sendQuoteExpiring } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/daily-notifications
 *
 * Envia e-mails de follow-up e de vencimento de orçamentos.
 * Roda diariamente às 9h UTC via Vercel Cron.
 *
 * Protegido por Authorization: Bearer {CRON_SECRET} — sem Supabase Auth.
 * A Vercel injeta o header automaticamente quando o cron é configurado no vercel.json.
 *
 * Lógica:
 * - Follow-up: orçamentos com status='sent', followup_notified_at IS NULL e
 *   cujo sent_at passou o prazo de followup_days do perfil do usuário (padrão: 5 dias).
 * - Vencimento: orçamentos com status='sent', expiry_notified_at IS NULL e
 *   approval_token_expires_at entre agora e 3 dias à frente.
 *
 * Após envio bem-sucedido, marca o campo sentinela correspondente para evitar reenvio.
 */
export async function POST(request: NextRequest) {
  // 1. Verificar Authorization ANTES de qualquer query ao banco
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/daily-notifications] CRON_SECRET não configurado");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Criar service client (sem contexto de auth — necessário para bypass do RLS)
  const supabase = createServiceClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orcafacil.com.br";

  let followupCount = 0;
  let expiryCount = 0;

  // ─── Follow-up ────────────────────────────────────────────────────────────

  const { data: followupCandidates, error: followupError } = await supabase
    .from("quotes")
    .select(
      "id, user_id, title, sent_at, quote_number, customers(name), profiles!inner(followup_days, business_name, id)"
    )
    .eq("status", "sent")
    .is("followup_notified_at", null);

  if (followupError) {
    console.error(
      "[cron/daily-notifications] Erro ao buscar candidatos de follow-up:",
      followupError
    );
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Filtrar em JS respeitando followup_days por perfil de usuário
  const now = new Date();

  const eligibleFollowup = (followupCandidates ?? []).filter((q) => {
    const profile = Array.isArray(q.profiles) ? q.profiles[0] : q.profiles;
    const followupDays = profile?.followup_days ?? 5;
    const threshold = new Date(q.sent_at);
    threshold.setDate(threshold.getDate() + followupDays);
    return threshold <= now;
  });

  for (const quote of eligibleFollowup) {
    const profile = Array.isArray(quote.profiles) ? quote.profiles[0] : quote.profiles;
    const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
    const businessName: string | null = profile?.business_name ?? null;
    const customerName: string | null = customer?.name ?? null;

    const daysSinceSent = Math.floor(
      (now.getTime() - new Date(quote.sent_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const quoteUrl = `${appUrl}/orcamentos/${quote.id}`;

    // Obter e-mail do marceneiro via admin API
    const { data: authUser } = await supabase.auth.admin.getUserById(quote.user_id);
    const email = authUser?.user?.email;

    if (!email) {
      console.warn(
        "[cron/daily-notifications] Sem e-mail para user_id:",
        quote.user_id
      );
      continue;
    }

    const result = await sendQuoteFollowup(email, {
      business_name: businessName,
      quote_number: quote.quote_number,
      customer_name: customerName,
      quote_url: quoteUrl,
      days_since_sent: daysSinceSent,
    });

    if (result.success) {
      await supabase
        .from("quotes")
        .update({ followup_notified_at: now.toISOString() })
        .eq("id", quote.id);
      followupCount++;
      console.log("[cron/daily-notifications] Follow-up enviado:", {
        quote_id: quote.id,
        email,
      });
    } else {
      console.error("[cron/daily-notifications] Falha no follow-up:", {
        quote_id: quote.id,
        error: result.error,
      });
    }
  }

  // ─── Vencimento ───────────────────────────────────────────────────────────

  const threeDaysFromNow = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: expiringQuotes, error: expiryError } = await supabase
    .from("quotes")
    .select(
      "id, user_id, title, quote_number, approval_token_expires_at, customers(name), profiles!inner(business_name)"
    )
    .eq("status", "sent")
    .is("expiry_notified_at", null)
    .lte("approval_token_expires_at", threeDaysFromNow)
    .gte("approval_token_expires_at", now.toISOString());

  if (expiryError) {
    console.error(
      "[cron/daily-notifications] Erro ao buscar orçamentos a vencer:",
      expiryError
    );
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  for (const quote of expiringQuotes ?? []) {
    const profile = Array.isArray(quote.profiles) ? quote.profiles[0] : quote.profiles;
    const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
    const businessName: string | null = profile?.business_name ?? null;
    const customerName: string | null = customer?.name ?? null;

    const expiresAt = new Date(quote.approval_token_expires_at);
    const msUntilExpiry = expiresAt.getTime() - now.getTime();
    const daysUntilExpiry = Math.max(
      1,
      Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24))
    );
    const quoteUrl = `${appUrl}/orcamentos/${quote.id}`;

    // Obter e-mail do marceneiro via admin API
    const { data: authUser } = await supabase.auth.admin.getUserById(quote.user_id);
    const email = authUser?.user?.email;

    if (!email) {
      console.warn(
        "[cron/daily-notifications] Sem e-mail para user_id (vencimento):",
        quote.user_id
      );
      continue;
    }

    const result = await sendQuoteExpiring(email, {
      business_name: businessName,
      quote_number: quote.quote_number,
      customer_name: customerName,
      quote_url: quoteUrl,
      days_until_expiry: daysUntilExpiry,
    });

    if (result.success) {
      await supabase
        .from("quotes")
        .update({ expiry_notified_at: now.toISOString() })
        .eq("id", quote.id);
      expiryCount++;
      console.log("[cron/daily-notifications] Vencimento enviado:", {
        quote_id: quote.id,
        email,
      });
    } else {
      console.error("[cron/daily-notifications] Falha no vencimento:", {
        quote_id: quote.id,
        error: result.error,
      });
    }
  }

  console.log("[cron/daily-notifications] Concluído:", {
    followup: followupCount,
    expiring: expiryCount,
  });

  return NextResponse.json({ followup: followupCount, expiring: expiryCount });
}
