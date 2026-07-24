import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [subscriptionStatus, subRow, paymentsRow] = await Promise.all([
    getSubscriptionStatus(user.id),
    supabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("subscription_payments")
      .select("id, amount, paid_at, period_end, receipt_url")
      .eq("user_id", user.id)
      .order("paid_at", { ascending: false })
      .limit(24),
  ]);

  const currentPeriodEnd = subRow.data?.current_period_end ?? null;

  let daysUntilRenewal: number | null = null;
  if (currentPeriodEnd) {
    const diff = new Date(currentPeriodEnd).getTime() - Date.now();
    daysUntilRenewal = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return NextResponse.json({
    ...subscriptionStatus,
    currentPeriodEnd,
    daysUntilRenewal,
    payments: paymentsRow.data ?? [],
  });
}
