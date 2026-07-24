"use client";

import { useState } from "react";

export interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

/**
 * Formata número de telefone brasileiro: (11) 99999-9999
 */
export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Salvar",
}: CustomerFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    try {
      await onSubmit({ name: name.trim(), phone, email, address, notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cliente");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="customer-name" className="text-sm font-medium text-text-base">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          id="customer-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do cliente"
          required
          className="border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customer-phone" className="text-sm font-medium text-text-base">
          Telefone
        </label>
        <input
          id="customer-phone"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
          placeholder="(11) 99999-9999"
          className="border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customer-email" className="text-sm font-medium text-text-base">
          E-mail
        </label>
        <input
          id="customer-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cliente@email.com"
          className="border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customer-address" className="text-sm font-medium text-text-base">
          Endereço
        </label>
        <input
          id="customer-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Rua, número, bairro..."
          className="border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customer-notes" className="text-sm font-medium text-text-base">
          Observações
        </label>
        <textarea
          id="customer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações adicionais..."
          rows={3}
          className="border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-border rounded-lg px-4 py-2 text-sm font-medium text-text-base hover:bg-border/20 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
