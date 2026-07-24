"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface CatalogItemFull {
  id: string;
  name: string;
  type: "material" | "service";
  unit: string;
  unit_price: number;
  is_active: boolean;
  image_url: string | null;
  imageSignedUrl: string | null;
  created_at: string;
}

export default function CatalogoItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: itemId } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<CatalogItemFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [type, setType] = useState<"material" | "service">("material");
  const [unit, setUnit] = useState("un");
  const [unitPrice, setUnitPrice] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/catalog/${itemId}`);
        if (!res.ok) {
          if (res.status === 404) router.replace("/catalogo");
          throw new Error("Item não encontrado");
        }
        const data: CatalogItemFull = await res.json();
        setItem(data);
        setName(data.name);
        setType(data.type);
        setUnit(data.unit);
        setUnitPrice(String(data.unit_price));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [itemId, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const priceNum = parseFloat(unitPrice.replace(",", "."));
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Preço inválido.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/catalog/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, unit, unit_price: priceNum }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao salvar");
      }
      const updated = await res.json();
      setItem((prev) => prev ? { ...prev, ...updated } : prev);
      setSuccess("Salvo com sucesso!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`/api/catalog/${itemId}/image`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao enviar imagem");
      }
      const data = await res.json();
      setItem((prev) => prev ? { ...prev, image_url: data.image_url, imageSignedUrl: data.imageSignedUrl } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveImage() {
    setIsUploadingImage(true);
    try {
      await fetch(`/api/catalog/${itemId}/image`, { method: "DELETE" });
      setItem((prev) => prev ? { ...prev, image_url: null, imageSignedUrl: null } : prev);
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/catalog/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao excluir");
      }
      router.replace("/catalogo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 animate-pulse">
        <div className="h-4 w-24 bg-border rounded mb-6" />
        <div className="h-6 w-48 bg-border rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-border/30 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-red-600 text-sm">{error ?? "Item não encontrado"}</p>
        <Link href="/catalogo" className="text-brand-primary text-sm mt-2 inline-block">← Voltar</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/catalogo" className="text-brand-primary hover:text-brand-primary/80 text-sm">
          ← Catálogo
        </Link>
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg transition-colors"
        >
          Excluir
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-4">{success}</p>
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-red-800 mb-3">
            Excluir "{item.name}"? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm font-medium text-text-base hover:bg-border/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
            </button>
          </div>
        </div>
      )}

      {/* Imagem */}
      <div className="bg-bg-base border border-border rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-text-base mb-3">Foto do item</h2>
        {item.imageSignedUrl ? (
          <div className="relative">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-border/20 mb-3">
              <Image
                src={item.imageSignedUrl}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 512px"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 text-text-base hover:bg-border/20 transition-colors disabled:opacity-50"
              >
                Trocar foto
              </button>
              <button
                onClick={handleRemoveImage}
                disabled={isUploadingImage}
                className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-brand-primary/50 transition-colors disabled:opacity-50"
          >
            {isUploadingImage ? (
              <span className="text-sm text-text-base/50">Enviando...</span>
            ) : (
              <>
                <p className="text-sm font-medium text-text-base mb-1">Adicionar foto</p>
                <p className="text-xs text-text-base/40">JPEG, PNG ou WebP — máx. 5MB</p>
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Formulário */}
      <div className="bg-bg-base border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-base mb-4">Dados do item</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-base mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Tábua de MDF 15mm"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-base mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "material" | "service")}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            >
              <option value="material">Material</option>
              <option value="service">Serviço</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-base mb-1">Unidade</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="un, m², m, kg..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-base mb-1">
              Preço unitário (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              placeholder="0,00"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-brand-primary text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}
