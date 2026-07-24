import { createClient } from "@/lib/supabase/server";

export type SubscriptionStatus = "trial" | "active" | "read_only" | "cancelled";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  daysLeft: number | null;
  canWrite: boolean;
  trialEndsAt: string | null;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionInfo> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      status: "read_only",
      daysLeft: null,
      canWrite: false,
      trialEndsAt: null,
    };
  }

  const status = data.status as SubscriptionStatus;
  const trialEndsAt = data.trial_ends_at ?? null;

  let daysLeft: number | null = null;
  if (status === "trial" && trialEndsAt) {
    const now = new Date();
    const diffMs = new Date(trialEndsAt).getTime() - now.getTime();
    daysLeft = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  const canWrite = status === "trial" || status === "active";

  return { status, daysLeft, canWrite, trialEndsAt };
}
