import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const service = createServiceClient();

  const [profileRes, authRes, paymentsRes, quotesRes, customersRes, catalogRes] =
    await Promise.all([
      service
        .from("profiles")
        .select("id, business_name, city, phone, created_at, subscriptions(status, trial_ends_at, current_period_end, abacatepay_subscription_id)")
        .eq("id", id)
        .single(),
      service.auth.admin.getUserById(id),
      service
        .from("subscription_payments")
        .select("id, amount, paid_at, period_end, receipt_url")
        .eq("user_id", id)
        .order("paid_at", { ascending: false }),
      service
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id),
      service
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id),
      service
        .from("catalog_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id),
    ]);

  if (profileRes.error) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: profileRes.data,
    auth: {
      email: authRes.data?.user?.email,
      name: authRes.data?.user?.user_metadata?.name,
    },
    payments: paymentsRes.data ?? [],
    usage: {
      quotes: quotesRes.count ?? 0,
      customers: customersRes.count ?? 0,
      catalog: catalogRes.count ?? 0,
    },
  });
}
