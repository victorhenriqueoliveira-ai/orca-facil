import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin/auth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const [subscriptionsRes, quotesRes, pdfsRes] = await Promise.all([
    service.from("subscriptions").select("status"),
    service.from("quotes").select("id", { count: "exact", head: true }),
    service.from("quote_pdfs").select("id", { count: "exact", head: true }),
  ]);

  const byStatus = { trial: 0, active: 0, read_only: 0, cancelled: 0 };
  for (const sub of subscriptionsRes.data ?? []) {
    if (sub.status in byStatus) byStatus[sub.status as keyof typeof byStatus]++;
  }

  return NextResponse.json({
    totalUsers: (subscriptionsRes.data ?? []).length,
    byStatus,
    mrr: byStatus.active * 49.9,
    totalQuotes: quotesRes.count ?? 0,
    totalPdfs: pdfsRes.count ?? 0,
  });
}
