"use client";

import { useEffect, useState, useCallback } from "react";
import type { CatalogItem } from "@/components/catalog-item-form";
import { CatalogItemForm } from "@/components/catalog-item-form";

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
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Catálogo</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          aria-label="Adicionar item ao catálogo"
        >
          + Adicionar
        </button>
      </div>

      {/* Abas */}
      <div className="mb-4 flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => setActiveTab("material")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            activeTab === "material"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
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
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
          aria-selected={activeTab === "service"}
          role="tab"
        >
          Serviços
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">{error}</div>
      ) : tabItems.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <p className="text-sm">Nenhum item cadastrado ainda.</p>
          <button
            onClick={openAdd}
            className="mt-3 text-sm font-medium text-blue-600 hover:underline"
          >
            Adicionar o primeiro item
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Itens ativos */}
          {activeItems.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
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
    <li className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
        <p className="text-xs text-gray-500">
          {item.unit} · {formatPrice(item.unit_price)}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-2">
        <button
          onClick={() => onEdit(item)}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
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
            item.is_active ? "bg-blue-600" : "bg-gray-200"
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
