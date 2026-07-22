import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPhoneBR } from "@/components/customer-form";

interface Quote {
  id: string;
  title: string | null;
  status: string;
  total_price: number | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Buscar dados do cliente
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, notes, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (customerError || !customer) {
    notFound();
  }

  const customerData = customer as Customer;

  // Buscar histórico de orçamentos do cliente
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, title, status, total_price, created_at")
    .eq("customer_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const quoteList = (quotes ?? []) as Quote[];

  const totalValue = quoteList.reduce((sum, q) => sum + (q.total_price ?? 0), 0);

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  function statusLabel(status: string) {
    const labels: Record<string, string> = {
      draft: "Rascunho",
      sent: "Enviado",
      approved: "Aprovado",
      rejected: "Rejeitado",
    };
    return labels[status] ?? status;
  }

  function statusColor(status: string) {
    const colors: Record<string, string> = {
      draft: "bg-border text-text-base/60",
      sent: "bg-brand-support/10 text-brand-support",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return colors[status] ?? "bg-border text-text-base/60";
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/clientes" className="text-brand-primary hover:text-brand-primary/80 text-sm">
          ← Clientes
        </Link>
      </div>

      {/* Dados do cliente */}
      <div className="bg-bg-base border border-border rounded-xl p-4 mb-6">
        <h1 className="text-xl font-bold text-text-base mb-3">{customerData.name}</h1>
        <dl className="flex flex-col gap-2">
          {customerData.phone && (
            <div className="flex gap-2">
              <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">Telefone</dt>
              <dd className="text-sm text-text-base">{formatPhoneBR(customerData.phone)}</dd>
            </div>
          )}
          {customerData.email && (
            <div className="flex gap-2">
              <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">E-mail</dt>
              <dd className="text-sm text-text-base">{customerData.email}</dd>
            </div>
          )}
          {customerData.address && (
            <div className="flex gap-2">
              <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">Endereço</dt>
              <dd className="text-sm text-text-base">{customerData.address}</dd>
            </div>
          )}
          {customerData.notes && (
            <div className="flex gap-2">
              <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">Observações</dt>
              <dd className="text-sm text-text-base">{customerData.notes}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">Cadastro</dt>
            <dd className="text-sm text-text-base">{formatDate(customerData.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* Histórico de orçamentos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-base">
            Orçamentos ({quoteList.length})
          </h2>
          {quoteList.length > 0 && (
            <span className="text-sm text-text-base/60">
              Total: {formatCurrency(totalValue)}
            </span>
          )}
        </div>

        {quoteList.length === 0 ? (
          <p className="text-sm text-text-base/50 text-center py-8 bg-bg-base border border-border rounded-xl">
            Nenhum orçamento associado a este cliente
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {quoteList.map((quote) => (
              <li
                key={quote.id}
                className="bg-bg-base border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-base truncate">
                      {quote.title ?? "Orçamento sem título"}
                    </p>
                    <p className="text-sm text-text-base/50">{formatDate(quote.created_at)}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(quote.status)}`}
                    >
                      {statusLabel(quote.status)}
                    </span>
                    {quote.total_price !== null && (
                      <span className="text-sm font-medium text-text-base">
                        {formatCurrency(quote.total_price)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
