"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

interface QuoteItem {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  quantity: number;
}

interface QuoteRoom {
  id: string;
  name: string;
  items: QuoteItem[];
}

interface QuoteVersion {
  id: string;
  name: string;
  profit_margin_pct: number;
  rooms: QuoteRoom[];
}

interface QuoteDetail {
  id: string;
  quote_number: number;
  title: string | null;
  status: QuoteStatus;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  versions: QuoteVersion[];
}

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  accepted: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-yellow-100 text-yellow-700",
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcTotal(rooms: QuoteRoom[], marginPct: number) {
  const subtotal = rooms.reduce((acc, room) =>
    acc + room.items.reduce((s, i) => s + i.unit_price * i.quantity, 0), 0);
  return subtotal * (1 + marginPct / 100);
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao carregar orçamento");
      }
      const data = await res.json();
      setQuote(data.quote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  async function handleGeneratePdf() {
    if (!quote) return;
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    try {
      const res = await fetch(`/api/quotes/${id}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "detailed", version_ids: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar PDF");
      setPdfUrl(data.signed_url);
      await fetchQuote();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  async function handleStatusChange(newStatus: QuoteStatus) {
    setIsChangingStatus(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao atualizar status");
      }
      await fetchQuote();
      setStatusMsg(`Status atualizado para "${STATUS_LABEL[newStatus]}"`);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao duplicar");
      router.push(`/orcamentos/${data.new_quote_id}`);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Erro ao duplicar");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-red-600 text-sm">{error ?? "Orçamento não encontrado"}</p>
        <Link href="/orcamentos" className="text-blue-600 text-sm underline">
          Voltar para orçamentos
        </Link>
      </div>
    );
  }

  const activeVersion = quote.versions[activeVersionIdx];

  const nextStatuses: Record<QuoteStatus, QuoteStatus[]> = {
    draft: ["sent", "expired"],
    sent: ["accepted", "rejected", "expired"],
    accepted: ["expired"],
    rejected: [],
    expired: [],
  };
  const availableStatuses = nextStatuses[quote.status] ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/orcamentos" className="text-gray-500 hover:text-gray-700">
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 truncate">
            Orçamento #{quote.quote_number}
            {quote.title ? ` — ${quote.title}` : ""}
          </h1>
          {quote.customer && (
            <p className="text-xs text-gray-500 truncate">{quote.customer.name}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[quote.status]}`}>
          {STATUS_LABEL[quote.status]}
        </span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Ações */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-3 rounded-xl disabled:opacity-60"
          >
            {isGeneratingPdf ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : "📄"}
            {isGeneratingPdf ? "Gerando..." : "Gerar PDF"}
          </button>
          <button
            onClick={handleDuplicate}
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 text-sm font-medium px-4 py-3 rounded-xl"
          >
            📋 Duplicar
          </button>
        </div>

        {/* PDF gerado */}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-xl"
          >
            ✅ Abrir PDF
          </a>
        )}

        {/* WhatsApp */}
        {pdfUrl && quote.customer?.phone && (
          <a
            href={`https://wa.me/55${quote.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${quote.customer.name}, segue o orçamento #${quote.quote_number}: ${pdfUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-green-500 text-white text-sm font-medium px-4 py-3 rounded-xl"
          >
            💬 Enviar pelo WhatsApp
          </a>
        )}

        {/* Alterar status */}
        {availableStatuses.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Atualizar status</p>
            <div className="flex flex-wrap gap-2">
              {availableStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isChangingStatus}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {statusMsg && (
          <p className="text-sm text-center text-gray-600">{statusMsg}</p>
        )}

        {/* Abas de versões */}
        {quote.versions.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quote.versions.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => setActiveVersionIdx(idx)}
                className={`flex-shrink-0 text-sm px-4 py-2 rounded-full border transition-colors ${
                  idx === activeVersionIdx
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        {/* Versão ativa */}
        {activeVersion && (
          <div className="space-y-3">
            {activeVersion.rooms.map((room) => {
              const roomTotal = room.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
              const roomWithMargin = roomTotal * (1 + activeVersion.profit_margin_pct / 100);
              return (
                <div key={room.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-800">{room.name}</span>
                    <span className="text-sm font-medium text-blue-600">{formatBRL(roomWithMargin)}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {room.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">
                            {item.quantity} {item.unit} × {formatBRL(item.unit_price)}
                          </p>
                        </div>
                        <span className="text-sm text-gray-600 ml-3">
                          {formatBRL(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="bg-blue-600 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-200">Total com margem ({activeVersion.profit_margin_pct}%)</p>
                <p className="text-lg font-bold text-white">
                  {formatBRL(calcTotal(activeVersion.rooms, activeVersion.profit_margin_pct))}
                </p>
              </div>
            </div>
          </div>
        )}

        {quote.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observações</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
