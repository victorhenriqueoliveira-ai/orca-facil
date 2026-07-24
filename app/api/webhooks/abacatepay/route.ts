import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import type { WebhookPayload } from "@/lib/abacatepay/types";

/**
 * Valida assinatura HMAC-SHA256 em base64 do webhook AbacatePay v2.
 * Header: X-Webhook-Signature
 */
export function validateWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("base64");
  return expected === signature;
}

/**
 * POST /api/webhooks/abacatepay
 * Processa eventos de assinatura com validação HMAC obrigatória.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-webhook-signature") ?? "";
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET ?? "";

  if (!secret) {
    console.error("[webhook] ABACATEPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!validateWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { event, data } = payload;
  const subscriptionId = data?.id ?? null;

  console.log("[webhook] received", { event, subscriptionId });

  const supabase = createServiceClient();

  let result: string;

  try {
    switch (event) {
      case "checkout.completed": {
        const userId = data.metadata?.user_id ?? null;
        if (!userId) {
          console.warn("[webhook] checkout.completed sem user_id no metadata");
          return NextResponse.json({ received: true, processed: false });
        }

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) throw error;
        result = `checkout.completed → status=active, period_end=${periodEnd.toISOString()}`;
        break;
      }

      case "subscription.completed": {
        // Tenta por subscription_id; se não achar, tenta por user_id do metadata
        const userId = data.metadata?.user_id ?? null;

        const updateData = {
          status: "active" as const,
          abacatepay_subscription_id: subscriptionId,
          current_period_end: data.currentPeriodEnd ?? null,
          updated_at: new Date().toISOString(),
        };

        if (subscriptionId) {
          const { error } = await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("abacatepay_subscription_id", subscriptionId);

          if (error && userId) {
            const { error: err2 } = await supabase
              .from("subscriptions")
              .update(updateData)
              .eq("user_id", userId);
            if (err2) throw err2;
          } else if (error) {
            throw error;
          }
        } else if (userId) {
          const { error } = await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("user_id", userId);
          if (error) throw error;
        }

        result = "completed → status=active";
        break;
      }

      case "subscription.renewed": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            current_period_end: data.currentPeriodEnd ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("abacatepay_subscription_id", subscriptionId);
        if (error) throw error;
        result = `renewed → current_period_end=${data.currentPeriodEnd}`;
        break;
      }

      case "subscription.cancelled": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("abacatepay_subscription_id", subscriptionId);
        if (error) throw error;
        result = "cancelled → status=cancelled";
        break;
      }

      default: {
        console.log("[webhook] event not handled:", event);
        return NextResponse.json({ received: true, processed: false });
      }
    }
  } catch (err) {
    console.error("[webhook] DB error:", { event, subscriptionId, err });
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  console.log("[webhook] processed", { event, subscriptionId, result });
  return NextResponse.json({ received: true, processed: true, result });
}
