import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin/auth";

export async function PATCH(
  request: Request,
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
  const body = await request.json();
  const { status, extendDays } = body as {
    status?: "trial" | "active" | "read_only" | "cancelled";
    extendDays?: number;
  };

  const service = createServiceClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status) {
    update.status = status;
    if (status === "trial") {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);
      update.trial_ends_at = trialEnd.toISOString();
    }
    if (status === "active" && !extendDays) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      update.current_period_end = periodEnd.toISOString();
    }
  }

  if (extendDays) {
    const current = new Date();
    current.setDate(current.getDate() + extendDays);
    update.current_period_end = current.toISOString();
    if (!status) update.status = "active";
  }

  const { error } = await service
    .from("subscriptions")
    .update(update)
    .eq("user_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
