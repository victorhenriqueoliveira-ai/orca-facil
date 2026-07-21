import { createClient } from "@/lib/supabase/server";

export type SubscriptionStatus = "trial" | "active" | "read_only" | "cancelled";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  daysLeft: number | null;
  canWrite: boolean;
  trialEndsAt: Date | null;
}

/**
 * Busca o status da assinatura do usuário autenticado no servidor.
 * Deve ser chamada apenas em Server Components ou Route Handlers.
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionInfo> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("user_id", userId)
    .single();

  // Se não encontrou subscription ou erro, assume read_only por segurança
  if (error || !data) {
    return {
      status: "read_only",
      daysLeft: null,
      canWrite: false,
      trialEndsAt: null,
    };
  }

  const status = data.status as SubscriptionStatus;
  const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;

  let daysLeft: number | null = null;
  if (status === "trial" && trialEndsAt) {
    const now = new Date();
    const diffMs = trialEndsAt.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  const canWrite = status === "trial" || status === "active";

  return {
    status,
    daysLeft,
    canWrite,
    trialEndsAt,
  };
}
