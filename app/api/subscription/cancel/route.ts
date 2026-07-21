import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/abacatepay/client";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/subscription/cancel
 * Cancela a assinatura ativa via AbacatePay e atualiza o banco.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Busca o subscription_id do banco
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("abacatepay_subscription_id, status")
    .eq("user_id", user.id)
    .single();

  if (fetchError || !sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  if (sub.status !== "active") {
    return NextResponse.json(
      { error: "Only active subscriptions can be cancelled" },
      { status: 400 }
    );
  }

  if (!sub.abacatepay_subscription_id) {
    return NextResponse.json(
      { error: "No AbacatePay subscription ID found" },
      { status: 400 }
    );
  }

  try {
    await cancelSubscription(sub.abacatepay_subscription_id);
  } catch (err) {
    console.error("[cancel] AbacatePay error:", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription with payment provider" },
      { status: 502 }
    );
  }

  // Atualiza status no banco usando service role
  const serviceClient = createServiceClient();
  const { error: updateError } = await serviceClient
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[cancel] DB update error:", updateError);
    return NextResponse.json(
      { error: "Subscription cancelled at provider but failed to update locally" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, status: "cancelled" });
}
