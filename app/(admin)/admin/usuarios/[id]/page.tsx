import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { AlterarAssinatura } from "./alterar-assinatura";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Ativo",
  read_only: "Read-only",
  cancelled: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  trial: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  read_only: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function UsuarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = createServiceClient();

  const [profileRes, authRes, paymentsRes, quotesRes, customersRes, catalogRes] =
    await Promise.all([
      service
        .from("profiles")
        .select("id, business_name, city, phone, cpf_cnpj, created_at, subscriptions(status, trial_ends_at, current_period_end)")
        .eq("id", id)
        .single(),
      service.auth.admin.getUserById(id),
      service
        .from("subscription_payments")
        .select("id, amount, paid_at, period_end, receipt_url")
        .eq("user_id", id)
        .order("paid_at", { ascending: false }),
      service.from("quotes").select("id", { count: "exact", head: true }).eq("user_id", id),
      service.from("customers").select("id", { count: "exact", head: true }).eq("user_id", id),
      service.from("catalog_items").select("id", { count: "exact", head: true }).eq("user_id", id),
    ]);

  if (profileRes.error || !profileRes.data) {
    notFound();
  }

  const profile = profileRes.data;
  const authUser = authRes.data?.user;
  const sub = Array.isArray(profile.subscriptions)
    ? profile.subscriptions[0]
    : profile.subscriptions;
  const payments = paymentsRes.data ?? [];

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/usuarios"
        className="text-sm text-text-base/50 hover:text-text-base mb-6 inline-block"
      >
        ← Usuários
      </Link>

      <h1 className="text-2xl font-bold text-text-base mb-1">
        {authUser?.user_metadata?.name || profile.business_name || "Usuário"}
      </h1>
      <p className="text-text-base/50 text-sm mb-8">{authUser?.email}</p>

      <div className="grid grid-cols-1 gap-6">
        {/* Perfil */}
        <Section title="Perfil">
          <Row label="Nome" value={authUser?.user_metadata?.name} />
          <Row label="Empresa" value={profile.business_name} />
          <Row label="CPF / CNPJ" value={profile.cpf_cnpj ?? undefined} />
          <Row label="Cidade" value={profile.city} />
          <Row label="Telefone" value={profile.phone} />
          <Row
            label="Cadastro"
            value={
              profile.created_at
                ? new Date(profile.created_at).toLocaleDateString("pt-BR")
                : undefined
            }
          />
        </Section>

        {/* Assinatura */}
        <Section title="Assinatura">
          <div className="flex items-center gap-3 mb-4">
            {sub?.status ? (
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  STATUS_CLASS[sub.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {STATUS_LABEL[sub.status] ?? sub.status}
              </span>
            ) : (
              <span className="text-text-base/30 text-sm">Sem assinatura</span>
            )}
          </div>
          {sub?.trial_ends_at && (
            <Row
              label="Trial até"
              value={new Date(sub.trial_ends_at).toLocaleDateString("pt-BR")}
            />
          )}
          {sub?.current_period_end && (
            <Row
              label="Período atual até"
              value={new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
            />
          )}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-text-base/50 uppercase tracking-wider mb-3">
              Alterar plano
            </p>
            <AlterarAssinatura userId={id} currentStatus={sub?.status} />
          </div>
        </Section>

        {/* Uso */}
        <Section title="Uso da plataforma">
          <div className="grid grid-cols-3 gap-4">
            <UsageCard label="Orçamentos" count={quotesRes.count ?? 0} />
            <UsageCard label="Clientes" count={customersRes.count ?? 0} />
            <UsageCard label="Itens no catálogo" count={catalogRes.count ?? 0} />
          </div>
        </Section>

        {/* Pagamentos */}
        <Section title={`Pagamentos (${payments.length})`}>
          {payments.length === 0 ? (
            <p className="text-text-base/40 text-sm">Nenhum pagamento registrado.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-semibold text-text-base/50">Data</th>
                  <th className="text-left py-2 font-semibold text-text-base/50">Valor</th>
                  <th className="text-left py-2 font-semibold text-text-base/50">Válido até</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-text-base/70">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="py-2 font-medium">
                      {typeof p.amount === "number"
                        ? (p.amount / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "—"}
                    </td>
                    <td className="py-2 text-text-base/50">
                      {p.period_end ? new Date(p.period_end).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="py-2 text-right">
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
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold text-text-base/50 uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-text-base/50">{label}</span>
      <span className="text-sm font-medium text-text-base">{value || "—"}</span>
    </div>
  );
}

function UsageCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-bg-base rounded-lg p-4 text-center">
      <p className="text-2xl font-bold text-text-base">{count}</p>
      <p className="text-xs text-text-base/50 mt-0.5">{label}</p>
    </div>
  );
}
