"use client";

import { useState } from "react";

export interface CatalogItem {
  id: string;
  name: string;
  type: "material" | "service";
  unit: string;
  unit_price: number;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
}

export interface CatalogItemFormProps {
  item?: CatalogItem | null;
  onClose: () => void;
  onSuccess: (item: CatalogItem) => void;
}

export function CatalogItemForm({ item, onClose, onSuccess }: CatalogItemFormProps) {
  const isEditing = Boolean(item);
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState<"material" | "service">(item?.type ?? "material");
  const [unit, setUnit] = useState(item?.unit ?? "un");
  const [unitPrice, setUnitPrice] = useState(
    item?.unit_price !== undefined ? String(item.unit_price) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(unitPrice.replace(",", "."));
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Preço unitário deve ser um número maior ou igual a 0.");
      return;
    }

    setLoading(true);
    try {
      const payload = { name, type, unit, unit_price: priceNum };

      let res: Response;
      if (isEditing && item) {
        res = await fetch(`/api/catalog/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao salvar item.");
        return;
      }

      const saved: CatalogItem = await res.json();
      onSuccess(saved);
    } catch {
      setError("Erro de rede ao salvar item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div role="form" aria-label={isEditing ? "Editar item do catálogo" : "Adicionar item ao catálogo"}>
      {error && (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="catalog-name" className="block text-sm font-medium text-text-base mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            id="catalog-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            placeholder="Ex: Tábua de MDF 15mm"
          />
        </div>

        <div>
          <label htmlFor="catalog-type" className="block text-sm font-medium text-text-base mb-1">
            Tipo
          </label>
          <select
            id="catalog-type"
            value={type}
            onChange={(e) => setType(e.target.value as "material" | "service")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          >
            <option value="material">Material</option>
            <option value="service">Serviço</option>
          </select>
        </div>

        <div>
          <label htmlFor="catalog-unit" className="block text-sm font-medium text-text-base mb-1">
            Unidade
          </label>
          <input
            id="catalog-unit"
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            placeholder="un, m², m, kg..."
          />
        </div>

        <div>
          <label htmlFor="catalog-unit-price" className="block text-sm font-medium text-text-base mb-1">
            Preço unitário (R$) <span className="text-red-500">*</span>
          </label>
          <input
            id="catalog-unit-price"
            type="text"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            placeholder="0,00"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-base hover:bg-border/20 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
}
