"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { calculateTotal, formatBRL, type QuoteRoom, type QuoteItem } from "@/lib/quotes/calculate";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface QuoteVersion {
  id: string;
  version_number: number;
  profit_margin_pct: number;
  rooms: QuoteRoom[];
}

interface QuoteData {
  id: string;
  quote_number: number;
  title: string | null;
  notes: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null } | null;
  versions: QuoteVersion[];
}

export interface StepReviewProps {
  quoteId: string;
  versionId: string;
  onNext: () => void;
  onBack: () => void;
}

// ----------------------------------------------------------------
// InlineEdit — campo editável inline para quantity/unit_price
// ----------------------------------------------------------------

interface InlineEditProps {
  value: number;
  onSave: (newValue: number) => Promise<void>;
  type?: "price" | "quantity";
  className?: string;
}

function InlineEdit({ value, onSave, type = "quantity", className = "" }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  // Sync value from parent (after external updates)
  useEffect(() => {
    if (!editing) {
      setInputVal(String(value));
    }
  }, [value, editing]);

  async function handleConfirm() {
    const parsed = parseFloat(inputVal.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      setInputVal(String(value));
      setEditing(false);
      return;
    }
    if (type === "quantity" && parsed <= 0) {
      setInputVal(String(value));
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === "Escape") {
      setInputVal(String(value));
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step={type === "price" ? "0.01" : "0.5"}
        min={type === "price" ? "0" : "0.01"}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={handleConfirm}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className={`border border-blue-400 rounded px-2 py-0.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        aria-label={type === "price" ? "Editar preço unitário" : "Editar quantidade"}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`text-sm underline decoration-dotted text-blue-700 hover:text-blue-900 transition-colors ${className}`}
      title="Clique para editar"
    >
      {type === "price" ? formatBRL(value) : value}
    </button>
  );
}

// ----------------------------------------------------------------
// RoomCard — exibe um ambiente com seus itens e totais
// ----------------------------------------------------------------

interface RoomCardProps {
  room: QuoteRoom;
  marginPct: number;
  quoteId: string;
  versionId: string;
  onItemUpdated: (roomId: string, itemId: string, updates: Partial<QuoteItem>) => void;
}

function RoomCard({ room, marginPct, quoteId, versionId, onItemUpdated }: RoomCardProps) {
  const subtotal = room.items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const totalWithMargin = subtotal * (1 + marginPct / 100);

  async function handleUpdateItem(
    itemId: string,
    field: "unit_price" | "quantity",
    newValue: number
  ) {
    const res = await fetch(
      `/api/quotes/${quoteId}/versions/${versionId}/rooms/${room.id}/items/${itemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Erro ao atualizar item");
    }
    // Atualizar estado local otimisticamente
    onItemUpdated(room.id, itemId, { [field]: newValue });
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Header do ambiente */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">{room.name}</h3>
      </div>

      {/* Lista de itens */}
      {room.items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-gray-400 italic">Nenhum item neste ambiente.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {room.items.map((item) => (
            <div key={item.id} className="px-4 py-3 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-gray-800 font-medium flex-1">{item.name}</span>
                <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                  {item.unit}
                </span>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Qtd:</span>
                  <InlineEdit
                    value={item.quantity}
                    type="quantity"
                    onSave={(v) => handleUpdateItem(item.id, "quantity", v)}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Preço unit.:</span>
                  <InlineEdit
                    value={item.unit_price}
                    type="price"
                    onSave={(v) => handleUpdateItem(item.id, "unit_price", v)}
                  />
                </div>

                <div className="ml-auto">
                  <span className="text-sm font-medium text-gray-700">
                    {formatBRL(item.unit_price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer do ambiente com subtotal */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-500">Total do ambiente</span>
        <div className="text-right">
          {marginPct > 0 && (
            <p className="text-xs text-gray-400 line-through">{formatBRL(subtotal)}</p>
          )}
          <p className="text-sm font-semibold text-gray-800">{formatBRL(totalWithMargin)}</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// StepReview — Etapa 3 do wizard
// ----------------------------------------------------------------

export function StepReview({ quoteId, versionId, onNext, onBack }: StepReviewProps) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [rooms, setRooms] = useState<QuoteRoom[]>([]);
  const [marginPct, setMarginPct] = useState<number>(0);
  const [marginInput, setMarginInput] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMargin, setSavingMargin] = useState(false);
  const marginSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar orçamento completo ao montar
  useEffect(() => {
    let cancelled = false;

    async function fetchQuote() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/quotes/${quoteId}`);
        if (!res.ok) {
          const err = await res.json();
          if (!cancelled) setError(err.error ?? "Erro ao carregar orçamento");
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        const quoteData: QuoteData = data.quote;
        setQuote(quoteData);

        // Usar a versão correspondente ao versionId
        const version = quoteData.versions.find((v) => v.id === versionId) ?? quoteData.versions[0];

        if (version) {
          setRooms(version.rooms ?? []);
          const margin = version.profit_margin_pct ?? 0;
          setMarginPct(margin);
          setMarginInput(String(margin));
        }
      } catch {
        if (!cancelled) setError("Erro ao carregar orçamento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuote();
    return () => {
      cancelled = true;
    };
  }, [quoteId, versionId]);

  // Salvar margem com debounce
  const saveMargin = useCallback(
    async (value: number) => {
      setSavingMargin(true);
      try {
        await fetch(`/api/quotes/${quoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profit_margin_pct: value, version_id: versionId }),
        });
      } finally {
        setSavingMargin(false);
      }
    },
    [quoteId, versionId]
  );

  function handleMarginChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMarginInput(e.target.value);
    const parsed = parseFloat(e.target.value.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      setMarginPct(parsed);

      // Debounce para salvar
      if (marginSaveRef.current) clearTimeout(marginSaveRef.current);
      marginSaveRef.current = setTimeout(() => {
        saveMargin(parsed);
      }, 800);
    }
  }

  function handleMarginBlur() {
    const parsed = parseFloat(marginInput.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      setMarginInput(String(marginPct));
      return;
    }
    setMarginPct(parsed);
    if (marginSaveRef.current) clearTimeout(marginSaveRef.current);
    saveMargin(parsed);
  }

  // Atualizar item no estado local após edição inline
  function handleItemUpdated(
    roomId: string,
    itemId: string,
    updates: Partial<QuoteItem>
  ) {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          items: room.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, ...updates };
          }),
        };
      })
    );
  }

  // Calcular totais
  const totals = calculateTotal(rooms, marginPct);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-gray-500">Carregando orçamento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      {/* Título da etapa */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Revisão do orçamento</h2>
        {quote?.customer && (
          <p className="text-sm text-gray-500">Cliente: {quote.customer.name}</p>
        )}
      </div>

      {/* Campo de margem de lucro */}
      <div className="border border-gray-200 rounded-xl bg-white p-4 flex items-center gap-4">
        <div className="flex-1">
          <label
            htmlFor="margin-input"
            className="text-sm font-medium text-gray-700 block mb-1"
          >
            Margem de lucro (%)
          </label>
          <p className="text-xs text-gray-400">
            Aplicada sobre o total bruto de cada ambiente.
          </p>
        </div>
        <div className="relative flex items-center">
          <input
            id="margin-input"
            type="number"
            min="0"
            max="1000"
            step="0.5"
            value={marginInput}
            onChange={handleMarginChange}
            onBlur={handleMarginBlur}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7"
            aria-label="Margem de lucro em porcentagem"
          />
          <span className="absolute right-2 text-gray-500 text-sm pointer-events-none">%</span>
          {savingMargin && (
            <span className="absolute -bottom-5 right-0 text-xs text-blue-500">
              Salvando...
            </span>
          )}
        </div>
      </div>

      {/* Ambientes e itens */}
      {rooms.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400">Nenhum ambiente adicionado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              marginPct={marginPct}
              quoteId={quoteId}
              versionId={versionId}
              onItemUpdated={handleItemUpdated}
            />
          ))}
        </div>
      )}

      {/* Total global destacado */}
      <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Total bruto</span>
          <span className="text-sm text-gray-600">{formatBRL(totals.grandTotalBruto)}</span>
        </div>
        {marginPct > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Margem ({marginPct}%)</span>
            <span className="text-sm text-gray-600">
              + {formatBRL(totals.grandTotal - totals.grandTotalBruto)}
            </span>
          </div>
        )}
        <div className="border-t border-blue-200 pt-2 mt-2 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-800">Total final</span>
          <span className="text-xl font-bold text-blue-700">{formatBRL(totals.grandTotal)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">Valor que o cliente paga</p>
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Avançar →
        </button>
      </div>
    </div>
  );
}
