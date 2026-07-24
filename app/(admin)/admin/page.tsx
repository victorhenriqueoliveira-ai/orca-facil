import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <p className="text-xs font-semibold text-text-base/50 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-text-base mt-1">{value}</p>
      {sub && <p className="text-sm text-text-base/50 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
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

  const totalUsers = (subscriptionsRes.data ?? []).length;
  const mrr = byStatus.active * 49.9;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-base mb-6">Visão geral</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total de usuários" value={String(totalUsers)} />
        <StatCard
          label="MRR estimado"
          value={mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          sub={`${byStatus.active} assinantes ativos`}
        />
        <StatCard label="Orçamentos criados" value={String(quotesRes.count ?? 0)} />
        <StatCard label="PDFs gerados" value={String(pdfsRes.count ?? 0)} />
      </div>

      <h2 className="text-sm font-semibold text-text-base/50 uppercase tracking-wider mb-3">
        Usuários por status
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard label="Em trial" count={byStatus.trial} color="amber" />
        <StatusCard label="Ativos" count={byStatus.active} color="green" />
        <StatusCard label="Read-only" count={byStatus.read_only} color="orange" />
        <StatusCard label="Cancelados" count={byStatus.cancelled} color="red" />
      </div>
    </div>
  );
}

function StatusCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "amber" | "green" | "orange" | "red";
}) {
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    green: "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{count}</p>
    </div>
  );
}
