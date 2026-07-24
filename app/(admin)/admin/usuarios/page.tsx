import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

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

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const { search = "", status = "" } = await searchParams;
  const service = createServiceClient();

  const [profilesRes, authRes] = await Promise.all([
    service
      .from("profiles")
      .select("id, business_name, city, created_at, subscriptions(status, trial_ends_at, current_period_end)")
      .order("created_at", { ascending: false }),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailMap = new Map(
    (authRes.data?.users ?? []).map((u) => [
      u.id,
      { email: u.email, name: (u.user_metadata?.name as string) ?? "" },
    ])
  );

  let users = (profilesRes.data ?? []).map((p) => ({
    ...p,
    ...emailMap.get(p.id),
    subscription: Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions,
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
    users = users.filter((u) => u.subscription?.status === status);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-base mb-6">Usuários</h1>

      <form className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por nome ou e-mail..."
          className="flex-1 border border-border rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <select
          name="status"
          defaultValue={status}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">Todos os status</option>
          <option value="trial">Trial</option>
          <option value="active">Ativo</option>
          <option value="read_only">Read-only</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <button
          type="submit"
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Filtrar
        </button>
      </form>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-bg-base">
              <th className="text-left px-4 py-3 font-semibold text-text-base/60">Usuário</th>
              <th className="text-left px-4 py-3 font-semibold text-text-base/60">Empresa</th>
              <th className="text-left px-4 py-3 font-semibold text-text-base/60">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-text-base/60">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-base/40">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-bg-base/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-text-base">{u.name || "—"}</p>
                  <p className="text-text-base/50 text-xs">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-text-base/70">{u.business_name || "—"}</td>
                <td className="px-4 py-3">
                  {u.subscription?.status ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_CLASS[u.subscription.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABEL[u.subscription.status] ?? u.subscription.status}
                    </span>
                  ) : (
                    <span className="text-text-base/30 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-base/50 text-xs">
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/usuarios/${u.id}`}
                    className="text-brand-primary text-xs font-medium hover:underline"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <p className="text-xs text-text-base/40 mt-3">{users.length} usuário(s)</p>
    </div>
  );
}
