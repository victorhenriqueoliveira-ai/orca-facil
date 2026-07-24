import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import type { WebhookPayload } from "@/lib/abacatepay/types";

/**
 * Valida a assinatura HMAC-SHA256 do webhook AbacatePay.
 * O body DEVE ser o texto raw (não parseado) para garantir a assinatura correta.
 */
export function validateWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

/**
 * POST /api/webhooks/abacatepay
 * Processa eventos de assinatura do AbacatePay com validação HMAC obrigatória.
 */
export async function POST(req: NextRequest) {
  // Lê body como texto raw ANTES de qualquer parse — obrigatório para HMAC válido
  const rawBody = await req.text();

  const signature = req.headers.get("x-abacatepay-signature") ?? "";
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET ?? "";

  if (!secret) {
    console.error("[webhook] ABACATEPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Valida HMAC — retorna 401 imediatamente sem processar ou logar o corpo
  if (!validateWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { event_type, abacatepay_subscription_id, data } = payload;

  console.log("[webhook] received", { event_type, abacatepay_subscription_id });

  const supabase = createServiceClient();

  let result: string;

  try {
    switch (event_type) {
      case "subscription.completed":
      case "subscription.activated": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            abacatepay_subscription_id,
            current_period_end: data.current_period_end ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("abacatepay_subscription_id", abacatepay_subscription_id)
          .or(
            data.metadata?.user_id
              ? `user_id.eq.${data.metadata.user_id}`
              : "user_id.is.null"
          );

        if (error) {
          // Se não encontrou por subscription_id, tenta por customer_id (metadata)
          if (data.metadata?.user_id) {
            const { error: err2 } = await supabase
              .from("subscriptions")
              .update({
                status: "active",
                abacatepay_subscription_id,
                current_period_end: data.current_period_end ?? null,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", data.metadata.user_id);
            if (err2) throw err2;
          } else {
            throw error;
          }
        }
        result = "completed/activated → status=active";
        break;
      }

      case "subscription.renewed": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            current_period_end: data.current_period_end ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("abacatepay_subscription_id", abacatepay_subscription_id);
        if (error) throw error;
        result = `renewed → current_period_end=${data.current_period_end}`;
        break;
      }

      case "subscription.cancelled": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("abacatepay_subscription_id", abacatepay_subscription_id);
        if (error) throw error;
        result = "cancelled → status=cancelled";
        break;
      }

      case "subscription.payment_failed": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "read_only",
            updated_at: new Date().toISOString(),
          })
          .eq("abacatepay_subscription_id", abacatepay_subscription_id);
        if (error) throw error;
        result = "payment_failed → status=read_only";
        break;
      }

      default: {
        console.warn("[webhook] unknown event_type:", event_type);
        return NextResponse.json({ received: true, processed: false });
      }
    }
  } catch (err) {
    console.error("[webhook] DB error:", {
      event_type,
      abacatepay_subscription_id,
      err,
    });
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  console.log("[webhook] processed", {
    event_type,
    abacatepay_subscription_id,
    result,
  });

  return NextResponse.json({ received: true, processed: true, result });
}
