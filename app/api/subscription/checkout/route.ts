import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createCustomer, createCheckout } from "@/lib/abacatepay/client";

/**
 * POST /api/subscription/checkout
 * Cria ou recupera cliente na AbacatePay, depois inicia checkout de assinatura.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productId = process.env.ABACATEPAY_PRODUCT_ID;
  if (!productId) {
    return NextResponse.json({ error: "ABACATEPAY_PRODUCT_ID not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const completionUrl = `${appUrl}/dashboard?subscribed=1`;
  const returnUrl = `${appUrl}/assinar`;

  try {
    // Busca abacatepay_customer_id já salvo, se existir
    const serviceClient = createServiceClient();
    const { data: sub } = await serviceClient
      .from("subscriptions")
      .select("abacatepay_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = sub?.abacatepay_customer_id ?? null;

    // Se não tem customer na AbacatePay, cria agora
    if (!customerId) {
      const customerRes = await createCustomer({
        email: user.email ?? "",
        name: user.user_metadata?.full_name ?? undefined,
        metadata: { user_id: user.id },
      });

      customerId = customerRes.data.id;

      // Salva o customer ID para reutilizar em próximos checkouts
      await serviceClient
        .from("subscriptions")
        .update({ abacatepay_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const checkout = await createCheckout({
      items: [{ id: productId, quantity: 1 }],
      customerId,
      externalId: user.id,
      completionUrl,
      returnUrl,
      methods: ["CARD"],
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ checkout_url: checkout.data.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[checkout] AbacatePay error:", message);
    return NextResponse.json(
      { error: "Failed to create checkout", detail: message },
      { status: 502 }
    );
  }
}
