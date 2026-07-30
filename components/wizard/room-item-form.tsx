"use client";

import { useState, useEffect } from "react";
import { diasDesdeAtualizacao, precoDesatualizado } from "@/lib/catalog/price-alert";

export interface CatalogItem {
  id: string;
  name: string;
  type: string;
  unit: string;
  unit_price: number;
  price_updated_at?: string | null;
}

export interface RoomItemFormData {
  catalog_item_id?: string;
  name: string;
  type: string;
  unit: string;
  unit_price: number;
  quantity: number;
}

export interface RoomItemFormProps {
  onSubmit: (data: RoomItemFormData) => Promise<void>;
  onCancel: () => void;
  priceAlertDays?: number;
}

const PRICE_ALERT_DAYS_DEFAULT = 60;

/**
 * Formulário para adicionar item a um ambiente.
 * Permite buscar no catálogo próprio ou criar item avulso.
 */
export function RoomItemForm({ onSubmit, onCancel, priceAlertDays: priceAlertDaysProp }: RoomItemFormProps) {
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [priceAlertDays, setPriceAlertDays] = useState<number>(
    priceAlertDaysProp ?? PRICE_ALERT_DAYS_DEFAULT
  );

  // Campos do item avulso / editáveis
  const [name, setName] = useState("");
  const [type, setType] = useState("material");
  const [unit, setUnit] = useState("un");
  const [unitPrice, setUnitPrice] = useState("0");
  const [quantity, setQuantity] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "catalog") {
      setCatalogLoading(true);
      fetch("/api/catalog")
        .then((r) => r.json())
        .then((data) => setCatalogItems(Array.isArray(data) ? data : []))
        .catch(() => setCatalogItems([]))
        .finally(() => setCatalogLoading(false));
    }
  }, [mode]);

  // Busca price_alert_days do perfil somente se não foi passado como prop
  useEffect(() => {
    if (priceAlertDaysProp !== undefined) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.price_alert_days === "number") {
          setPriceAlertDays(data.price_alert_days);
        }
      })
      .catch(() => {
        // mantém o default se falhar
      });
  }, [priceAlertDaysProp]);

  function selectCatalogItem(item: CatalogItem) {
    setSelectedCatalogItem(item);
    setName(item.name);
    setType(item.type);
    setUnit(item.unit);
    setUnitPrice(String(item.unit_price));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedPrice = parseFloat(unitPrice);
    const parsedQty = parseFloat(quantity);

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Preço deve ser >= 0");
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError("Quantidade deve ser > 0");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        catalog_item_id: selectedCatalogItem?.id,
        name: name.trim(),
        type,
        unit,
        unit_price: parsedPrice,
        quantity: parsedQty,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar item");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Seletor de modo */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("catalog");
            setSelectedCatalogItem(null);
            setName("");
            setUnitPrice("0");
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
            mode === "catalog"
              ? "bg-blue-600 text-white border-blue-600"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Do catálogo
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("custom");
            setSelectedCatalogItem(null);
            setName("");
            setUnitPrice("0");
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
            mode === "custom"
              ? "bg-blue-600 text-white border-blue-600"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Avulso
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
      )}

      {/* Catálogo */}
      {mode === "catalog" && !selectedCatalogItem && (
        <div className="flex flex-col gap-2">
          {catalogLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">Carregando catálogo...</p>
          ) : catalogItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Catálogo vazio. Adicione itens em Catálogo ou use item avulso.
            </p>
          ) : (
            <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {catalogItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectCatalogItem(item)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <span className="text-sm text-gray-600">
                        R$ {item.unit_price.toFixed(2)}/{item.unit}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 capitalize">{item.type}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Formulário de item (avulso ou do catálogo selecionado) */}
      {(mode === "custom" || selectedCatalogItem) && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {selectedCatalogItem && (
            <>
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-blue-800">{selectedCatalogItem.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCatalogItem(null);
                    setName("");
                    setUnitPrice("0");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Trocar
                </button>
              </div>
              {/* Aviso de preço desatualizado */}
              {precoDesatualizado(selectedCatalogItem.price_updated_at, priceAlertDays) && (
                <div
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-xs text-amber-600">
                    O preço deste item foi atualizado há{" "}
                    {diasDesdeAtualizacao(selectedCatalogItem.price_updated_at)} dias. Verifique
                    antes de continuar.
                  </p>
                </div>
              )}
            </>
          )}

          {mode === "custom" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dobradiça 35mm"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="material">Material</option>
                    <option value="service">Serviço</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 w-24">
                  <label className="text-sm font-medium text-gray-700">Unidade</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="un"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-gray-700">
                Preço unit. (R$)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1 w-28">
              <label className="text-sm font-medium text-gray-700">Quantidade</label>
              <input
                type="number"
                inputMode="decimal"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      {/* Botão cancelar no modo catálogo sem item selecionado */}
      {mode === "catalog" && !selectedCatalogItem && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
