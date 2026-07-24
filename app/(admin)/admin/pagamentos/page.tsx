import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function PagamentosPage() {
  const service = createServiceClient();

  const { data: payments } = await service
    .from("subscription_payments")
    .select("id, user_id, amount, paid_at, period_end, receipt_url, profiles(business_name)")
    .order("paid_at", { ascending: false })
    .limit(200);

  const authRes = await service.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    (authRes.data?.users ?? []).map((u) => [u.id, u.email])
  );

  const total = (payments ?? []).reduce((acc, p) => acc + (p.amount ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-base mb-2">Pagamentos</h1>
      <p className="text-text-base/50 text-sm mb-6">
        {(payments ?? []).length} pagamentos ·{" "}
        <span className="font-semibold text-text-base">
          {(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>{" "}
        total
      </p>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-border bg-bg-base">
              <th className="text-left px-4 py-3 font-semibold text-text-base/60">Usuário</th>
              <th className="text-left px-4 py-3 font-semibold text-text-base/60">Data</th>
              <th className="text-left px-4 py-3 font-semibold text-text-base/60">Valor</th>
              <th className="text-left px-4 py-3 font-semibold text-text-base/60">Válido até</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-base/40">
                  Nenhum pagamento registrado.
                </td>
              </tr>
            )}
            {(payments ?? []).map((p) => {
              const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg-base/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-base">
                      {profile?.business_name || "—"}
                    </p>
                    <p className="text-xs text-text-base/40">{emailMap.get(p.user_id) ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-text-base/70">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-text-base">
                    {typeof p.amount === "number"
                      ? (p.amount / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-base/50">
                    {p.period_end ? new Date(p.period_end).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.receipt_url && (
                      <a
                        href={p.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary text-xs hover:underline"
                      >
                        Recibo
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
