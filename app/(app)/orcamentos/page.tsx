"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuoteCard, type QuoteCardData, type QuoteStatus } from "@/components/quote-card";

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "Todos", value: "" },
  { label: "Rascunho", value: "draft" },
  { label: "Enviado", value: "sent" },
  { label: "Aprovado", value: "accepted" },
  { label: "Rejeitado", value: "rejected" },
  { label: "Expirado", value: "expired" },
];

export default function OrcamentosPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const limit = 20;

  const fetchQuotes = useCallback(
    async (status: string, p: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        params.set("page", String(p));
        params.set("limit", String(limit));

        const res = await fetch(`/api/quotes?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Erro ao buscar orçamentos");
        }
        const data = await res.json();
        setQuotes(data.quotes ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao buscar orçamentos");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchQuotes(statusFilter, page);
  }, [statusFilter, page, fetchQuotes]);

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  async function handleDuplicate(id: string) {
    setDuplicatingId(id);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao duplicar orçamento");
      }
      const data = await res.json();
      setFeedbackMessage("Orçamento duplicado com sucesso!");
      // Navegar para o novo orçamento
      router.push(`/orcamentos/${data.new_quote_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao duplicar orçamento");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleStatusChange(id: string, newStatus: QuoteStatus) {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao atualizar status");
      }
      setFeedbackMessage("Status atualizado com sucesso!");
      // Recarregar lista
      fetchQuotes(statusFilter, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  }

  async function handleViewPdf(id: string) {
    try {
      const res = await fetch(`/api/quotes/${id}/pdf/latest`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao obter PDF");
      }
      const data = await res.json();
      window.open(data.signed_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir PDF");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-base">Orçamentos</h1>
        <Link
          href="/orcamentos/novo"
          className="bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          + Novo
        </Link>
      </div>

      {/* Status filter chips — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleStatusFilterChange(f.value)}
            className={`flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === f.value
                ? "bg-brand-primary text-white border-brand-primary"
                : "bg-bg-base text-text-base/70 border-border hover:border-brand-primary/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feedback message */}
      {feedbackMessage && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          {feedbackMessage}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>
      )}

      {/* Quote list */}
      {isLoading ? (
        <p className="text-sm text-text-base/50 text-center py-12">Carregando orçamentos...</p>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-base/50 mb-4">
            {statusFilter
              ? "Nenhum orçamento encontrado com este status."
              : "Você ainda não tem orçamentos."}
          </p>
          {!statusFilter && (
            <Link
              href="/orcamentos/novo"
              className="inline-block bg-brand-primary text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-brand-primary/90 transition-colors"
            >
              Criar primeiro orçamento
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-text-base/40 mb-3">{total} orçamento{total !== 1 ? "s" : ""}</p>
          <ul className="flex flex-col gap-3">
            {quotes.map((quote) => (
              <li key={quote.id}>
                <QuoteCard
                  quote={quote}
                  onDuplicate={handleDuplicate}
                  onStatusChange={handleStatusChange}
                  onViewPdf={handleViewPdf}
                  isDuplicating={duplicatingId === quote.id}
                />
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-sm text-text-base/60 hover:text-text-base disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 border border-border rounded-lg"
              >
                Anterior
              </button>
              <span className="text-sm text-text-base/50">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-sm text-text-base/60 hover:text-text-base disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 border border-border rounded-lg"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
