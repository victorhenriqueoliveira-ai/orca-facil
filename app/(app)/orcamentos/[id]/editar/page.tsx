"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { RoomItemForm, type RoomItemFormData } from "@/components/wizard/room-item-form";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface QuoteItem {
  id: string;
  name: string;
  type: string;
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
  version_number: number;
  profit_margin_pct: number;
  rooms: QuoteRoom[];
}

interface QuoteDetail {
  id: string;
  quote_number: number;
  title: string | null;
  notes: string | null;
  customer: { id: string; name: string } | null;
  versions: QuoteVersion[];
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ----------------------------------------------------------------
// InlineEdit — clique para editar número
// ----------------------------------------------------------------

function InlineEdit({
  value,
  onSave,
  type = "quantity",
}: {
  value: number;
  onSave: (v: number) => Promise<void>;
  type?: "price" | "quantity";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  async function confirm() {
    const parsed = parseFloat(draft.replace(",", "."));
    if (isNaN(parsed) || parsed < 0 || (type === "quantity" && parsed <= 0)) {
      setDraft(String(value));
      setEditing(false);
      return;
    }
    setSaving(true);
    try { await onSave(parsed); } finally { setSaving(false); setEditing(false); }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step={type === "price" ? "0.01" : "0.5"}
        min={type === "price" ? "0" : "0.01"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={confirm}
        onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
        disabled={saving}
        className="border border-brand-primary/50 rounded px-2 py-0.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 text-text-base bg-bg-base"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm underline decoration-dotted text-brand-primary hover:text-brand-primary/80 transition-colors"
      title="Clique para editar"
    >
      {type === "price" ? formatBRL(value) : value}
    </button>
  );
}

// ----------------------------------------------------------------
// RoomCard — ambiente com itens editáveis
// ----------------------------------------------------------------

function RoomCard({
  room, quoteId, versionId, marginPct,
  onItemUpdated, onItemDeleted, onItemAdded, onRoomDeleted, onRoomRenamed,
}: {
  room: QuoteRoom;
  quoteId: string;
  versionId: string;
  marginPct: number;
  onItemUpdated: (roomId: string, itemId: string, updates: Partial<QuoteItem>) => void;
  onItemDeleted: (roomId: string, itemId: string) => void;
  onItemAdded: (roomId: string, item: QuoteItem) => void;
  onRoomDeleted: (roomId: string) => void;
  onRoomRenamed: (roomId: string, name: string) => void;
}) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(room.name);

  const subtotal = room.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = subtotal * (1 + marginPct / 100);

  async function handleUpdateItem(itemId: string, field: "unit_price" | "quantity", value: number) {
    const res = await fetch(`/api/quotes/${quoteId}/versions/${versionId}/rooms/${room.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) throw new Error("Erro ao atualizar item");
    onItemUpdated(room.id, itemId, { [field]: value });
  }

  async function handleDeleteItem(itemId: string) {
    setDeletingItem(itemId);
    try {
      await fetch(`/api/quotes/${quoteId}/versions/${versionId}/rooms/${room.id}/items/${itemId}`, { method: "DELETE" });
      onItemDeleted(room.id, itemId);
    } finally { setDeletingItem(null); }
  }

  async function handleAddItem(data: RoomItemFormData) {
    const res = await fetch(`/api/quotes/${quoteId}/versions/${versionId}/rooms/${room.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Erro ao adicionar item"); }
    const { item_id } = await res.json();
    onItemAdded(room.id, { id: item_id, name: data.name, type: data.type, unit: data.unit, unit_price: data.unit_price, quantity: data.quantity });
    setShowAddItem(false);
  }

  async function handleDeleteRoom() {
    setDeletingRoom(true);
    try {
      await fetch(`/api/quotes/${quoteId}/versions/${versionId}/rooms/${room.id}`, { method: "DELETE" });
      onRoomDeleted(room.id);
    } finally { setDeletingRoom(false); }
  }

  async function handleRenameRoom() {
    if (!nameDraft.trim() || nameDraft.trim() === room.name) { setEditingName(false); return; }
    await fetch(`/api/quotes/${quoteId}/versions/${versionId}/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameDraft.trim() }),
    });
    onRoomRenamed(room.id, nameDraft.trim());
    setEditingName(false);
  }

  return (
    <div className="border border-border rounded-xl bg-bg-base overflow-hidden">
      {/* Header do ambiente */}
      <div className="px-4 py-3 bg-border/10 border-b border-border flex items-center justify-between gap-2">
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameRoom(); if (e.key === "Escape") { setNameDraft(room.name); setEditingName(false); } }}
              className="flex-1 border border-border rounded px-2 py-1 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <button onClick={handleRenameRoom} className="text-xs text-brand-primary font-medium">OK</button>
            <button onClick={() => { setNameDraft(room.name); setEditingName(false); }} className="text-xs text-text-base/50">✕</button>
          </div>
        ) : (
          <button onClick={() => { setNameDraft(room.name); setEditingName(true); }} className="text-sm font-semibold text-text-base hover:text-brand-primary transition-colors text-left flex-1">
            {room.name} <span className="text-text-base/30 font-normal">✎</span>
          </button>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-medium text-brand-primary">{formatBRL(total)}</span>
          {confirmDeleteRoom ? (
            <div className="flex gap-1">
              <button onClick={() => setConfirmDeleteRoom(false)} className="text-xs text-text-base/50 px-2 py-1 border border-border rounded">Não</button>
              <button onClick={handleDeleteRoom} disabled={deletingRoom} className="text-xs text-red-600 px-2 py-1 border border-red-200 rounded disabled:opacity-50">
                {deletingRoom ? "..." : "Sim"}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDeleteRoom(true)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors" title="Excluir ambiente">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="divide-y divide-border">
        {room.items.map((item) => (
          <div key={item.id} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-base truncate">{item.name}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-base/50">Qtd:</span>
                  <InlineEdit value={item.quantity} type="quantity" onSave={(v) => handleUpdateItem(item.id, "quantity", v)} />
                  <span className="text-xs text-text-base/40">{item.unit}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-base/50">Preço:</span>
                  <InlineEdit value={item.unit_price} type="price" onSave={(v) => handleUpdateItem(item.id, "unit_price", v)} />
                </div>
                <span className="text-xs font-medium text-text-base ml-auto">{formatBRL(item.unit_price * item.quantity)}</span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteItem(item.id)}
              disabled={deletingItem === item.id}
              className="text-red-400 hover:text-red-600 text-xs px-1.5 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0 mt-0.5"
              title="Remover item"
            >
              {deletingItem === item.id ? "..." : "✕"}
            </button>
          </div>
        ))}
      </div>

      {/* Adicionar item */}
      {showAddItem ? (
        <div className="border-t border-border">
          <RoomItemForm onSubmit={handleAddItem} onCancel={() => setShowAddItem(false)} />
        </div>
      ) : (
        <div className="px-4 py-2 border-t border-border">
          <button
            onClick={() => setShowAddItem(true)}
            className="w-full text-sm text-brand-primary hover:text-brand-primary/80 py-1 transition-colors text-center"
          >
            + Adicionar item
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Página principal de edição
// ----------------------------------------------------------------

export default function EditarOrcamentoPage() {
  const { id: quoteId } = useParams<{ id: string }>();
  const router = useRouter();

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [rooms, setRooms] = useState<QuoteRoom[]>([]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [marginPct, setMarginPct] = useState(0);
  const [marginInput, setMarginInput] = useState("0");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [savingMargin, setSavingMargin] = useState(false);
  const marginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQuote = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (!res.ok) { router.replace(`/orcamentos/${quoteId}`); return; }
      const { quote: q } = await res.json();
      setQuote(q);
      const version = q.versions?.[0];
      if (version) {
        setVersionId(version.id);
        setRooms(version.rooms ?? []);
        setMarginPct(version.profit_margin_pct ?? 0);
        setMarginInput(String(version.profit_margin_pct ?? 0));
      }
    } catch { setError("Erro ao carregar orçamento"); }
    finally { setIsLoading(false); }
  }, [quoteId, router]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  async function handleAddRoom() {
    const name = newRoomName.trim() || "Ambiente personalizado";
    setAddingRoom(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/versions/${versionId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { room_id, items } = await res.json();
      setRooms((prev) => [...prev, { id: room_id, name, items: items ?? [] }]);
      setNewRoomName("");
      setShowRoomInput(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao adicionar ambiente");
    } finally { setAddingRoom(false); }
  }

  function handleMarginChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMarginInput(e.target.value);
    const parsed = parseFloat(e.target.value.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      setMarginPct(parsed);
      if (marginTimerRef.current) clearTimeout(marginTimerRef.current);
      marginTimerRef.current = setTimeout(async () => {
        setSavingMargin(true);
        try {
          await fetch(`/api/quotes/${quoteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profit_margin_pct: parsed, version_id: versionId }),
          });
        } finally { setSavingMargin(false); }
      }, 800);
    }
  }

  // Handlers de estado local
  function handleItemUpdated(roomId: string, itemId: string, updates: Partial<QuoteItem>) {
    setRooms((prev) => prev.map((r) => r.id !== roomId ? r : {
      ...r, items: r.items.map((i) => i.id !== itemId ? i : { ...i, ...updates }),
    }));
  }

  function handleItemDeleted(roomId: string, itemId: string) {
    setRooms((prev) => prev.map((r) => r.id !== roomId ? r : {
      ...r, items: r.items.filter((i) => i.id !== itemId),
    }));
  }

  function handleItemAdded(roomId: string, item: QuoteItem) {
    setRooms((prev) => prev.map((r) => r.id !== roomId ? r : { ...r, items: [...r.items, item] }));
  }

  function handleRoomDeleted(roomId: string) {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }

  function handleRoomRenamed(roomId: string, name: string) {
    setRooms((prev) => prev.map((r) => r.id !== roomId ? r : { ...r, name }));
  }

  // Totais
  const grandTotal = rooms.reduce((acc, room) => {
    const sub = room.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    return acc + sub * (1 + marginPct / 100);
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-red-600 text-sm">{error ?? "Orçamento não encontrado"}</p>
        <button onClick={() => router.back()} className="text-brand-primary text-sm underline">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base pb-32">
      {/* Header */}
      <div className="bg-bg-base border-b border-border px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-10">
        <button onClick={() => router.replace(`/orcamentos/${quoteId}`)} className="text-text-base/50 hover:text-text-base flex-shrink-0">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-text-base truncate">
            Editando #{quote.quote_number}{quote.title ? ` — ${quote.title}` : ""}
          </h1>
          {quote.customer && <p className="text-xs text-text-base/50 truncate">{quote.customer.name}</p>}
        </div>
        <button
          onClick={() => router.replace(`/orcamentos/${quoteId}`)}
          className="flex-shrink-0 bg-brand-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-primary/90 transition-colors"
        >
          Concluído
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

        {/* Margem de lucro */}
        <div className="bg-bg-base border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-base">Margem de lucro</p>
            <p className="text-xs text-text-base/50 mt-0.5">Aplicada sobre o total bruto</p>
          </div>
          <div className="relative flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="1000"
              step="0.5"
              value={marginInput}
              onChange={handleMarginChange}
              onBlur={() => {
                const p = parseFloat(marginInput.replace(",", "."));
                if (isNaN(p) || p < 0) setMarginInput(String(marginPct));
              }}
              className="w-20 border border-border rounded-lg px-2 py-1.5 text-sm text-right text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/40 pr-6"
            />
            <span className="absolute right-2 text-text-base/50 text-sm pointer-events-none">%</span>
          </div>
          {savingMargin && <span className="text-xs text-text-base/40 flex-shrink-0">Salvando...</span>}
        </div>

        {/* Ambientes */}
        <div className="space-y-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              quoteId={quoteId}
              versionId={versionId!}
              marginPct={marginPct}
              onItemUpdated={handleItemUpdated}
              onItemDeleted={handleItemDeleted}
              onItemAdded={handleItemAdded}
              onRoomDeleted={handleRoomDeleted}
              onRoomRenamed={handleRoomRenamed}
            />
          ))}
        </div>

        {/* Adicionar ambiente */}
        {showRoomInput ? (
          <div className="bg-bg-base border border-border rounded-xl p-4 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddRoom(); if (e.key === "Escape") { setShowRoomInput(false); setNewRoomName(""); } }}
              placeholder="Nome do ambiente..."
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <button
              onClick={handleAddRoom}
              disabled={addingRoom}
              className="bg-brand-primary text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50"
            >
              {addingRoom ? "..." : "Adicionar"}
            </button>
            <button onClick={() => { setShowRoomInput(false); setNewRoomName(""); }} className="text-text-base/50 hover:text-text-base text-sm px-2 py-2">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setShowRoomInput(true)}
            className="w-full border-2 border-dashed border-border rounded-xl px-4 py-3 text-sm text-text-base/60 hover:border-brand-primary/50 hover:text-brand-primary transition-colors"
          >
            + Adicionar ambiente
          </button>
        )}

        {/* Total */}
        <div className="bg-brand-primary rounded-xl px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60">Total com margem ({marginPct}%)</p>
            <p className="text-2xl font-bold text-white">{formatBRL(grandTotal)}</p>
          </div>
          <p className="text-xs text-white/40 text-right">
            {rooms.reduce((s, r) => s + r.items.length, 0)} iten{rooms.reduce((s, r) => s + r.items.length, 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
