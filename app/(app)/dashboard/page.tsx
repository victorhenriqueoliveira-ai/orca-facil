import { createClient } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/dashboard/get-stats";
import { getConversionMetrics } from "@/lib/dashboard/get-conversion";
import { DashboardClient } from "./dashboard-client";

function getMesAtualInicio(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

function getMesAtualFim(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [stats, conversion] = await Promise.all([
    getDashboardStats(supabase, user!.id),
    getConversionMetrics(supabase, user!.id, getMesAtualInicio(), getMesAtualFim()),
  ]);

  return <DashboardClient initialStats={stats} initialConversion={conversion} />;
}
