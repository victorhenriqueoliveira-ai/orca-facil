"use client";

import { useEffect, useState, useCallback } from "react";
import type { CatalogItem } from "@/components/catalog-item-form";
import { CatalogItemForm } from "@/components/catalog-item-form";
import type { Metadata } from "next";

type Tab = "material" | "service";

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CatalogoPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("material");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog?include_inactive=true");
      if (!res.ok) throw new Error("Erro ao carregar catálogo");
      const data: CatalogItem[] = await res.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleToggleActive(item: CatalogItem) {
    try {
      const res = await fetch(`/api/catalog/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (!res.ok) return;
      const updated: CatalogItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch {
      // silently fail — user can retry
    }
  }

  function handleFormSuccess(saved: CatalogItem) {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === saved.id);
      if (exists) {
        return prev.map((i) => (i.id === saved.id ? saved : i));
      }
      return [...prev, saved];
    });
    setShowForm(false);
    setEditingItem(null);
  }

  function openAdd() {
    setEditingItem(null);
    setShowForm(true);
  }

  function openEdit(item: CatalogItem) {
    setEditingItem(item);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
  }

  const tabItems = items.filter((i) => i.type === activeTab);
  const activeItems = tabItems.filter((i) => i.is_active);
  const inactiveItems = tabItems.filter((i) => !i.is_active);

  return (
    <div className="mx-auto max-w-lg lg:max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-base">Catálogo</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
          aria-label="Adicionar item ao catálogo"
        >
          + Adicionar
        </button>
      </div>

      {/* Abas */}
      <div className="mb-4 flex rounded-lg border border-border bg-bg-base p-1">
        <button
          onClick={() => setActiveTab("material")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            activeTab === "material"
              ? "bg-white text-brand-primary shadow-sm"
              : "text-text-base/60 hover:text-text-base"
          }`}
          aria-selected={activeTab === "material"}
          role="tab"
        >
          Materiais
        </button>
        <button
          onClick={() => setActiveTab("service")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            activeTab === "service"
              ? "bg-white text-brand-primary shadow-sm"
              : "text-text-base/60 hover:text-text-base"
          }`}
          aria-selected={activeTab === "service"}
          role="tab"
        >
          Serviços
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="py-12 text-center text-text-base/50">Carregando...</div>
      ) : error ? (
        <div className="py-12 text-center text-error">{error}</div>
      ) : tabItems.length === 0 ? (
        <div className="py-12 text-center text-text-base/40">
          <p className="text-sm">Nenhum item cadastrado ainda.</p>
          <button
            onClick={openAdd}
            className="mt-3 text-sm font-medium text-brand-primary hover:underline"
          >
            Adicionar o primeiro item
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Itens ativos */}
          {activeItems.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-base/50">
                Ativos ({activeItems.length})
              </h2>
              <ul className="space-y-2">
                {activeItems.map((item) => (
                  <CatalogItemRow
                    key={item.id}
                    item={item}
                    onEdit={openEdit}
                    onToggle={handleToggleActive}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Itens inativos */}
          {inactiveItems.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-base/40">
                Inativos ({inactiveItems.length})
              </h2>
              <ul className="space-y-2 opacity-60">
                {inactiveItems.map((item) => (
                  <CatalogItemRow
                    key={item.id}
                    item={item}
                    onEdit={openEdit}
                    onToggle={handleToggleActive}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Bottom sheet / modal de formulário */}
      {showForm && (
        <CatalogItemForm
          item={editingItem}
          onClose={closeForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

interface CatalogItemRowProps {
  item: CatalogItem;
  onEdit: (item: CatalogItem) => void;
  onToggle: (item: CatalogItem) => void;
}

function CatalogItemRow({ item, onEdit, onToggle }: CatalogItemRowProps) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-border bg-bg-base px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-base">{item.name}</p>
        <p className="text-xs text-text-base/50">
          {item.unit} · {formatPrice(item.unit_price)}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-2">
        <button
          onClick={() => onEdit(item)}
          className="rounded px-2 py-1 text-xs text-text-base/50 hover:bg-border/30"
          aria-label={`Editar ${item.name}`}
        >
          Editar
        </button>
        {/* Toggle de inativação */}
        <button
          onClick={() => onToggle(item)}
          aria-label={item.is_active ? `Inativar ${item.name}` : `Ativar ${item.name}`}
          aria-pressed={item.is_active}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            item.is_active ? "bg-brand-primary" : "bg-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              item.is_active ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </li>
  );
}
