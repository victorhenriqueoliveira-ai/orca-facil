"use client";

import Link from "next/link";

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface QuoteCardData {
  id: string;
  quote_number: number;
  title: string | null;
  status: QuoteStatus;
  customer_name: string | null;
  customer_id: string | null;
  total_with_margin: number;
  created_at: string;
  has_pdf: boolean;
}

interface QuoteCardProps {
  quote: QuoteCardData;
  onDuplicate: (id: string) => void;
  onStatusChange: (id: string, status: QuoteStatus) => void;
  onViewPdf: (id: string) => void;
  isDuplicating?: boolean;
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  accepted: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const NEXT_STATUS_OPTIONS: Partial<Record<QuoteStatus, QuoteStatus[]>> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function QuoteCard({
  quote,
  onDuplicate,
  onStatusChange,
  onViewPdf,
  isDuplicating = false,
}: QuoteCardProps) {
  const statusOptions = NEXT_STATUS_OPTIONS[quote.status] ?? [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/orcamentos/${quote.id}`} className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-base leading-tight">
            #{quote.quote_number}
            {quote.title ? ` — ${quote.title}` : ""}
          </p>
          {quote.customer_name && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{quote.customer_name}</p>
          )}
        </Link>
        <span
          className={`flex-shrink-0 inline-block text-xs font-medium px-2 py-1 rounded-full ${
            STATUS_COLORS[quote.status]
          }`}
        >
          {STATUS_LABELS[quote.status]}
        </span>
      </div>

      {/* Value and Date */}
      <div className="flex items-center justify-between mt-2 mb-3">
        <p className="text-lg font-bold text-gray-900">{formatCurrency(quote.total_with_margin)}</p>
        <p className="text-xs text-gray-400">{formatDate(quote.created_at)}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        {/* View PDF */}
        {quote.has_pdf && (
          <button
            onClick={() => onViewPdf(quote.id)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium py-1 px-2 rounded hover:bg-blue-50 transition-colors"
          >
            Ver PDF
          </button>
        )}

        {/* Status changes */}
        {statusOptions.map((nextStatus) => (
          <button
            key={nextStatus}
            onClick={() => onStatusChange(quote.id, nextStatus)}
            className="text-xs text-gray-600 hover:text-gray-800 font-medium py-1 px-2 rounded hover:bg-gray-100 transition-colors"
          >
            Marcar como {STATUS_LABELS[nextStatus].toLowerCase()}
          </button>
        ))}

        {/* Duplicate */}
        <button
          onClick={() => onDuplicate(quote.id)}
          disabled={isDuplicating}
          className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1 px-2 rounded hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDuplicating ? "Duplicando..." : "Duplicar"}
        </button>
      </div>
    </div>
  );
}
