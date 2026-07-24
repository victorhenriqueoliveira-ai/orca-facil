"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

export interface QuoteDetail {
  id: string;
  quote_number: number;
  title: string | null;
  status: QuoteStatus;
  notes: string | null;
  show_margin_on_pdf: boolean;
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
  sent: "bg-brand-support/10 text-brand-support",
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

export default function QuoteDetailClient({
  initialQuote,
  quoteId,
}: {
  initialQuote: QuoteDetail;
  quoteId: string;
}) {
  const router = useRouter();

  const [quote, setQuote] = useState<QuoteDetail>(initialQuote);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingToClient, setIsSendingToClient] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const [isSavingMarginToggle, setIsSavingMarginToggle] = useState(false);

  const refreshQuote = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setQuote(data.quote);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [quoteId]);

  async function handleSaveTitle() {
    const newTitle = titleDraft.trim() || null;
    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setQuote((prev) => ({ ...prev, title: newTitle }));
      }
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  }

  async function handleToggleMargin() {
    const newValue = !quote.show_margin_on_pdf;
    setQuote((prev) => ({ ...prev, show_margin_on_pdf: newValue }));
    setIsSavingMarginToggle(true);
    try {
      await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_margin_on_pdf: newValue }),
      });
    } finally {
      setIsSavingMarginToggle(false);
    }
  }

  async function handleGeneratePdf() {
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "detailed", version_ids: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar PDF");
      setPdfUrl(data.signed_url);
      setQuote((prev) => ({ ...prev, status: "sent" }));
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
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao atualizar status");
      }
      setQuote((prev) => ({ ...prev, status: newStatus }));
      setStatusMsg(`Status atualizado para "${STATUS_LABEL[newStatus]}"`);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao duplicar");
      router.push(`/orcamentos/${data.new_quote_id}`);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Erro ao duplicar");
    }
  }

  async function handleSendToClient() {
    setIsSendingToClient(true);
    setStatusMsg(null);
    try {
      let url = pdfUrl;
      if (!url) {
        const res = await fetch(`/api/quotes/${quoteId}/pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "detailed", version_ids: [] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao gerar PDF");
        url = data.signed_url;
        setPdfUrl(url);
        setQuote((prev) => ({ ...prev, status: "sent" }));
      }
      if (quote.customer?.phone) {
        const phone = quote.customer.phone.replace(/\D/g, "");
        const msg = encodeURIComponent(
          `Olá ${quote.customer.name}, segue seu orçamento #${quote.quote_number}${quote.title ? ` — ${quote.title}` : ""}:\n${url}`
        );
        window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
      } else if (url) {
        await navigator.clipboard.writeText(url).catch(() => {});
        setStatusMsg("Link do orçamento copiado!");
      }
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setIsSendingToClient(false);
    }
  }

  // Used to force refresh after returning from edit page
  void refreshQuote;

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
    <div className="min-h-screen bg-bg-base pb-24">
      {/* Header */}
      <div className="bg-bg-base border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/orcamentos" className="text-text-base/50 hover:text-text-base flex-shrink-0">
          ←
        </Link>
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                placeholder="Nome do orçamento..."
                className="flex-1 min-w-0 text-sm border border-border rounded-lg px-2 py-1 text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              />
              <button
                onClick={handleSaveTitle}
                disabled={isSavingTitle}
                className="text-xs text-white bg-brand-primary px-2 py-1 rounded-lg disabled:opacity-50 flex-shrink-0"
              >
                {isSavingTitle ? "..." : "OK"}
              </button>
              <button
                onClick={() => setIsEditingTitle(false)}
                className="text-xs text-text-base/50 hover:text-text-base flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setTitleDraft(quote.title ?? ""); setIsEditingTitle(true); }}
              className="text-left w-full group"
            >
              <h1 className="text-base font-semibold text-text-base group-hover:text-brand-primary transition-colors leading-tight">
                Orçamento #{quote.quote_number}
                {quote.title ? ` — ${quote.title}` : ""}
                <span className="ml-1 text-xs text-text-base/30 group-hover:text-brand-primary/60">✎</span>
              </h1>
              {quote.customer && (
                <p className="text-xs text-text-base/50 truncate">{quote.customer.name}</p>
              )}
            </button>
          )}
        </div>
        <span className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[quote.status]}`}>
          {STATUS_LABEL[quote.status]}
        </span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Toggle: mostrar margem de lucro no PDF */}
        <div className="bg-bg-base border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-base">Mostrar lucro no PDF</p>
            <p className="text-xs text-text-base/50 mt-0.5">
              {quote.show_margin_on_pdf
                ? "O cliente verá a margem de lucro no orçamento"
                : "A margem de lucro ficará oculta do cliente"}
            </p>
          </div>
          <button
            onClick={handleToggleMargin}
            disabled={isSavingMarginToggle}
            aria-pressed={quote.show_margin_on_pdf}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
              quote.show_margin_on_pdf ? "bg-brand-primary" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                quote.show_margin_on_pdf ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Ações principais */}
        <button
          onClick={handleSendToClient}
          disabled={isSendingToClient || isGeneratingPdf}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-3.5 rounded-xl disabled:opacity-60 hover:bg-green-700 transition-colors"
        >
          {isSendingToClient ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
          {isSendingToClient
            ? (pdfUrl ? "Abrindo WhatsApp..." : "Gerando PDF...")
            : quote.customer?.phone
              ? "Enviar ao cliente (WhatsApp)"
              : "Enviar ao cliente"}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf || isSendingToClient}
            className="flex items-center justify-center gap-2 bg-brand-primary text-white text-sm font-medium px-4 py-3 rounded-xl disabled:opacity-60"
          >
            {isGeneratingPdf ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            )}
            {isGeneratingPdf ? "Gerando..." : "Gerar PDF"}
          </button>
          <Link
            href={`/orcamentos/${quoteId}/editar`}
            className="flex items-center justify-center gap-2 bg-bg-base border border-border text-text-base/70 text-sm font-medium px-4 py-3 rounded-xl"
          >
            ✏️ Editar
          </Link>
        </div>
        <button
          onClick={handleDuplicate}
          className="w-full flex items-center justify-center gap-2 bg-bg-base border border-border text-text-base/70 text-sm font-medium px-4 py-3 rounded-xl"
        >
          📋 Duplicar
        </button>

        {/* PDF gerado — link direto */}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-bg-base border border-green-300 text-green-700 text-sm font-medium px-4 py-3 rounded-xl hover:bg-green-50 transition-colors"
          >
            ✅ Abrir PDF gerado
          </a>
        )}

        {/* Alterar status */}
        {availableStatuses.length > 0 && (
          <div className="bg-bg-base rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-medium text-text-base/50 uppercase tracking-wide">Atualizar status</p>
            <div className="flex flex-wrap gap-2">
              {availableStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isChangingStatus}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-text-base/70 hover:bg-border/30 disabled:opacity-50"
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {statusMsg && (
          <p className={`text-sm text-center ${statusMsg.startsWith("Erro") || statusMsg.startsWith("erro") ? "text-red-600" : "text-text-base/60"}`}>
            {statusMsg}
          </p>
        )}

        {isRefreshing && (
          <p className="text-xs text-center text-text-base/30">Atualizando...</p>
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
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-bg-base text-text-base/70 border-border"
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
                <div key={room.id} className="bg-bg-base rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-text-base">{room.name}</span>
                    <span className="text-sm font-medium text-brand-primary">{formatBRL(roomWithMargin)}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {room.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-base truncate">{item.name}</p>
                          <p className="text-xs text-text-base/40">
                            {item.quantity} {item.unit} × {formatBRL(item.unit_price)}
                          </p>
                        </div>
                        <span className="text-sm text-text-base/60 ml-3">
                          {formatBRL(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="bg-brand-primary rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Total com margem ({activeVersion.profit_margin_pct}%)</p>
                <p className="text-lg font-bold text-white">
                  {formatBRL(calcTotal(activeVersion.rooms, activeVersion.profit_margin_pct))}
                </p>
              </div>
            </div>
          </div>
        )}

        {quote.notes && (
          <div className="bg-bg-base rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-text-base/50 uppercase tracking-wide mb-1">Observações</p>
            <p className="text-sm text-text-base whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
