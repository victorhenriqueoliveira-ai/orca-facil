import { createClient } from "@/lib/supabase/server";

export type SubscriptionStatus = "trial" | "active" | "read_only" | "cancelled";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  daysLeft: number | null;
  canWrite: boolean;
  trialEndsAt: string | null;
  isExpired: boolean;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionInfo> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, current_period_end")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      status: "read_only",
      daysLeft: null,
      canWrite: false,
      trialEndsAt: null,
      isExpired: false,
    };
  }

  let status = data.status as SubscriptionStatus;
  const trialEndsAt = data.trial_ends_at ?? null;
  const currentPeriodEnd = data.current_period_end ?? null;

  // Se estava active mas o período expirou, trata como read_only imediatamente
  let isExpired = false;
  if (status === "active" && currentPeriodEnd) {
    isExpired = new Date(currentPeriodEnd).getTime() < Date.now();
    if (isExpired) status = "read_only";
  }

  let daysLeft: number | null = null;
  if (status === "trial" && trialEndsAt) {
    const diffMs = new Date(trialEndsAt).getTime() - Date.now();
    daysLeft = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  const canWrite = status === "trial" || status === "active";

  return { status, daysLeft, canWrite, trialEndsAt, isExpired };
}
