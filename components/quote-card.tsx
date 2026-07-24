"use client";

import { useState } from "react";
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
  onDelete: (id: string) => void;
  isDuplicating?: boolean;
  isDeleting?: boolean;
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
  onDelete,
  isDuplicating = false,
  isDeleting = false,
}: QuoteCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const statusOptions = NEXT_STATUS_OPTIONS[quote.status] ?? [];

  return (
    <div className="bg-bg-base border border-border rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/orcamentos/${quote.id}`} className="flex-1 min-w-0">
          <p className="font-semibold text-text-base text-base leading-tight">
            #{quote.quote_number}
            {quote.title ? ` — ${quote.title}` : ""}
          </p>
          {quote.customer_name && (
            <p className="text-sm text-text-base/50 truncate mt-0.5">{quote.customer_name}</p>
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
        <p className="text-lg font-bold text-text-base">{formatCurrency(quote.total_with_margin)}</p>
        <p className="text-xs text-text-base/40">{formatDate(quote.created_at)}</p>
      </div>

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm">
          <p className="text-red-800 font-medium mb-2">Excluir este orçamento?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-border rounded px-2 py-1 text-xs text-text-base hover:bg-border/20"
            >
              Cancelar
            </button>
            <button
              onClick={() => { setConfirmDelete(false); onDelete(quote.id); }}
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white rounded px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        {/* Editar */}
        <Link
          href={`/orcamentos/${quote.id}`}
          className="text-xs text-brand-primary hover:text-brand-primary/80 font-medium py-1 px-2 rounded hover:bg-brand-primary/5 transition-colors"
        >
          Editar
        </Link>

        {/* View PDF */}
        {quote.has_pdf && (
          <button
            onClick={() => onViewPdf(quote.id)}
            className="text-xs text-brand-support hover:text-brand-support/80 font-medium py-1 px-2 rounded hover:bg-brand-support/5 transition-colors"
          >
            Ver PDF
          </button>
        )}

        {/* Status changes */}
        {statusOptions.map((nextStatus) => (
          <button
            key={nextStatus}
            onClick={() => onStatusChange(quote.id, nextStatus)}
            className="text-xs text-text-base/60 hover:text-text-base font-medium py-1 px-2 rounded hover:bg-border/30 transition-colors"
          >
            Marcar como {STATUS_LABELS[nextStatus].toLowerCase()}
          </button>
        ))}

        {/* Duplicate e Delete */}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => onDuplicate(quote.id)}
            disabled={isDuplicating}
            className="text-xs text-text-base/50 hover:text-text-base font-medium py-1 px-2 rounded hover:bg-border/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDuplicating ? "Duplicando..." : "Duplicar"}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isDeleting}
            className="text-xs text-red-500 hover:text-red-700 font-medium py-1 px-2 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
