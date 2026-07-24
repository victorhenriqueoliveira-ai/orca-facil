"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CustomerForm, type CustomerFormData, formatPhoneBR } from "@/components/customer-form";

interface Quote {
  id: string;
  quote_number: number;
  title: string | null;
  status: string;
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

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  accepted: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-border text-text-base/60",
  sent: "bg-brand-support/10 text-brand-support",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

export default function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    params.then(({ id }) => setCustomerId(id));
  }, [params]);

  useEffect(() => {
    if (!customerId) return;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [custRes, quotesRes] = await Promise.all([
          fetch(`/api/customers/${customerId}`),
          fetch(`/api/quotes?customer_id=${customerId}&limit=50`),
        ]);

        if (!custRes.ok) {
          if (custRes.status === 404) router.replace("/clientes");
          throw new Error("Erro ao carregar cliente");
        }

        const custData = await custRes.json();
        setCustomer(custData);

        if (quotesRes.ok) {
          const qData = await quotesRes.json();
          setQuotes(qData.quotes ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [customerId, router]);

  async function handleEdit(data: CustomerFormData) {
    if (!customerId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao salvar");
      }
      const updated = await res.json();
      setCustomer(updated);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!customerId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao excluir");
      }
      router.replace("/clientes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  if (isLoading) {
    return (
      <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 animate-pulse">
        <div className="h-4 w-24 bg-border rounded mb-6" />
        <div className="bg-border/20 border border-border rounded-xl p-4 mb-6">
          <div className="h-6 w-40 bg-border rounded mb-4" />
          <div className="h-4 w-32 bg-border rounded mb-2" />
          <div className="h-4 w-48 bg-border rounded" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-red-600 text-sm">{error ?? "Cliente não encontrado"}</p>
        <Link href="/clientes" className="text-brand-primary text-sm mt-2 inline-block">
          ← Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/clientes" className="text-brand-primary hover:text-brand-primary/80 text-sm">
          ← Clientes
        </Link>
        {!isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium text-brand-primary hover:text-brand-primary/80 px-3 py-1.5 border border-brand-primary/30 rounded-lg transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg transition-colors"
            >
              Excluir
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-red-800 mb-3">
            Excluir "{customer.name}"? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm font-medium text-text-base hover:bg-border/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
            </button>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="bg-bg-base border border-border rounded-xl mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-semibold text-text-base">Editar cliente</h2>
          </div>
          <CustomerForm
            initialData={{
              name: customer.name,
              phone: customer.phone ?? "",
              email: customer.email ?? "",
              address: customer.address ?? "",
              notes: customer.notes ?? "",
            }}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            isLoading={isSaving}
            submitLabel="Salvar alterações"
          />
        </div>
      ) : (
        <div className="bg-bg-base border border-border rounded-xl p-4 mb-6">
          <h1 className="text-xl font-bold text-text-base mb-3">{customer.name}</h1>
          <dl className="flex flex-col gap-2">
            {customer.phone && (
              <div className="flex gap-2">
                <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">Telefone</dt>
                <dd className="text-sm text-text-base">{formatPhoneBR(customer.phone)}</dd>
              </div>
            )}
            {customer.email && (
              <div className="flex gap-2">
                <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">E-mail</dt>
                <dd className="text-sm text-text-base">{customer.email}</dd>
              </div>
            )}
            {customer.address && (
              <div className="flex gap-2">
                <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">Endereço</dt>
                <dd className="text-sm text-text-base">{customer.address}</dd>
              </div>
            )}
            {customer.notes && (
              <div className="flex gap-2">
                <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">Observações</dt>
                <dd className="text-sm text-text-base">{customer.notes}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-sm text-text-base/50 w-20 flex-shrink-0">Cadastro</dt>
              <dd className="text-sm text-text-base">{formatDate(customer.created_at)}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Histórico de orçamentos */}
      {!isEditing && (
        <div>
          <h2 className="text-base font-semibold text-text-base mb-3">
            Orçamentos ({quotes.length})
          </h2>
          {quotes.length === 0 ? (
            <p className="text-sm text-text-base/50 text-center py-8 bg-bg-base border border-border rounded-xl">
              Nenhum orçamento associado a este cliente
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {quotes.map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/orcamentos/${quote.id}`}
                    className="bg-bg-base border border-border rounded-lg p-4 flex items-center justify-between hover:border-brand-primary/40 transition-colors block"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-base truncate">
                        #{quote.quote_number}{quote.title ? ` — ${quote.title}` : ""}
                      </p>
                      <p className="text-sm text-text-base/50">{formatDate(quote.created_at)}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ml-3 flex-shrink-0 ${
                        STATUS_COLORS[quote.status] ?? "bg-border text-text-base/60"
                      }`}
                    >
                      {STATUS_LABELS[quote.status] ?? quote.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
