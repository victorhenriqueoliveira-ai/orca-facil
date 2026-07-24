import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckout } from "@/lib/abacatepay/client";

/**
 * POST /api/subscription/checkout
 * Inicia checkout de assinatura via AbacatePay.
 * Retorna { checkout_url } para redirecionar o cliente.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? "") + "/dashboard?subscribed=1";

  try {
    const checkout = await createCheckout({
      amount: 4900, // R$ 49,00 em centavos
      redirect_url: redirectUrl,
      customer_id: user.id,
      description: "Plano Orça Fácil Pro — Mensal",
    });

    return NextResponse.json({ checkout_url: checkout.checkout_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[checkout] AbacatePay error:", message);
    return NextResponse.json(
      { error: "Failed to create checkout", detail: message },
      { status: 502 }
    );
  }
}
