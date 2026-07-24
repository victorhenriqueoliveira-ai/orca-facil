import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin/auth";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const service = createServiceClient();

  const [profilesRes, authRes] = await Promise.all([
    service
      .from("profiles")
      .select("id, business_name, city, phone, created_at, subscriptions(status, trial_ends_at, current_period_end)")
      .order("created_at", { ascending: false }),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailMap = new Map(
    (authRes.data?.users ?? []).map((u) => [
      u.id,
      { email: u.email, name: u.user_metadata?.name as string | undefined },
    ])
  );

  let users = (profilesRes.data ?? []).map((p) => ({
    ...p,
    ...emailMap.get(p.id),
  }));

  if (search) {
    const q = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.business_name?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
    );
  }

  if (status) {
    users = users.filter((u) => {
      const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions;
      return sub?.status === status;
    });
  }

  return NextResponse.json({ users });
}
