import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTrialReminder } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

interface EligibleUser {
  user_id: string;
  business_name: string | null;
  profile_id: string;
  trial_ends_at: string;
  quote_count: number;
  email: string;
}

/**
 * POST /api/cron/trial-reminder
 *
 * Envia e-mails de reengajamento para usuários com trial expirando em 3 dias.
 * Protegido apenas por Authorization: Bearer {CRON_SECRET} — sem Supabase Auth
 * (crons não têm sessão de usuário).
 *
 * A Vercel injeta o header automaticamente quando o cron é configurado no vercel.json.
 */
export async function POST(request: NextRequest) {
  // 1. Verificar Authorization ANTES de qualquer query ao banco
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/trial-reminder] CRON_SECRET não configurado");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Buscar usuários elegíveis usando service_role (sem contexto de auth)
  const supabase = createServiceClient();

  const { data: eligible, error: queryError } = await supabase.rpc(
    "get_trial_reminder_eligible"
  );

  // Se o RPC não existir, usamos query direta via from()
  let users: EligibleUser[] = [];

  if (queryError) {
    // Fallback: query manual via from() + join manual
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select(
        `
        user_id,
        trial_ends_at,
        profiles!inner(business_name, id)
      `
      )
      .eq("status", "trial")
      .gte("trial_ends_at", new Date().toISOString())
      .lte(
        "trial_ends_at",
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      )
      .is("trial_reminder_sent_at", null);

    if (subError) {
      console.error("[cron/trial-reminder] Erro ao buscar elegíveis:", subError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Buscar auth emails via admin API do Supabase (service_role tem acesso)
    const userIds = (subscriptions ?? []).map((s) => s.user_id);
    const emailMap: Record<string, string> = {};

    for (const userId of userIds) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        emailMap[userId] = authUser.user.email;
      }
    }

    // Buscar contagem de orçamentos por usuário
    const quoteCounts: Record<string, number> = {};
    if (userIds.length > 0) {
      const { data: quotes } = await supabase
        .from("quotes")
        .select("user_id")
        .in("user_id", userIds);

      for (const q of quotes ?? []) {
        quoteCounts[q.user_id] = (quoteCounts[q.user_id] ?? 0) + 1;
      }
    }

    users = (subscriptions ?? [])
      .filter((s) => emailMap[s.user_id])
      .map((s) => {
        const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return {
          user_id: s.user_id,
          business_name: profile?.business_name ?? null,
          profile_id: profile?.id ?? s.user_id,
          trial_ends_at: s.trial_ends_at,
          quote_count: quoteCounts[s.user_id] ?? 0,
          email: emailMap[s.user_id],
        };
      });
  } else {
    users = eligible ?? [];
  }

  // 3. Enviar e-mails e registrar envios
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orcafacil.com.br";
  const signUpUrl = `${appUrl}/assinar`;

  const results = {
    sent: 0,
    errors: [] as Array<{ user_id: string; error: string }>,
  };

  for (const user of users) {
    const trialEndsAt = new Date(user.trial_ends_at);
    const now = new Date();
    const msLeft = trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    const result = await sendTrialReminder(user.email, {
      business_name: user.business_name,
      quote_count: user.quote_count,
      days_left: daysLeft,
      sign_up_url: signUpUrl,
    });

    if (result.success) {
      // 4. Registrar envio bem-sucedido para evitar duplicatas
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ trial_reminder_sent_at: new Date().toISOString() })
        .eq("user_id", user.user_id);

      if (updateError) {
        console.error(
          "[cron/trial-reminder] Erro ao atualizar trial_reminder_sent_at:",
          { user_id: user.user_id, error: updateError }
        );
        results.errors.push({
          user_id: user.user_id,
          error: `DB update failed: ${updateError.message}`,
        });
      } else {
        results.sent++;
        console.log("[cron/trial-reminder] E-mail enviado e registrado:", {
          user_id: user.user_id,
          email: user.email,
        });
      }
    } else {
      console.error("[cron/trial-reminder] Falha ao enviar e-mail:", {
        user_id: user.user_id,
        error: result.error,
      });
      results.errors.push({
        user_id: user.user_id,
        error: result.error ?? "Unknown error",
      });
    }
  }

  console.log("[cron/trial-reminder] Concluído:", results);

  return NextResponse.json(results);
}
