import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const [byStatusRes, acceptedValueRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("status")
      .eq("user_id", user.id),
    supabase
      .from("quotes")
      .select(`
        quote_versions (
          profit_margin_pct,
          quote_rooms ( quote_items ( unit_price, quantity ) )
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "accepted"),
  ]);

  const counts = { draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0 };
  for (const q of byStatusRes.data ?? []) {
    const s = q.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }

  let acceptedTotalValue = 0;
  for (const q of (acceptedValueRes.data ?? []) as Array<Record<string, unknown>>) {
    const versions = (q.quote_versions as Array<Record<string, unknown>>) ?? [];
    if (versions.length === 0) continue;
    const v = versions[0];
    const margin = ((v.profit_margin_pct as number) ?? 0) / 100;
    const rooms = (v.quote_rooms as Array<Record<string, unknown>>) ?? [];
    let sub = 0;
    for (const room of rooms) {
      const items = (room.quote_items as Array<Record<string, unknown>>) ?? [];
      for (const item of items) {
        sub += ((item.unit_price as number) ?? 0) * ((item.quantity as number) ?? 0);
      }
    }
    acceptedTotalValue += sub * (1 + margin);
  }

  return NextResponse.json({
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    by_status: counts,
    accepted_total_value: Math.round(acceptedTotalValue * 100) / 100,
  });
}
