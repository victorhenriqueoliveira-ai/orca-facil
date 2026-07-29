"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CustomerForm, type CustomerFormData, formatPhoneBR } from "@/components/customer-form";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = q.trim() ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/customers${params}`);
      if (!res.ok) throw new Error("Erro ao buscar clientes");
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar clientes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchCustomers]);

  async function handleCreate(data: CustomerFormData) {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao criar cliente");
      }
      setShowCreate(false);
      fetchCustomers(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cliente");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-base">Clientes</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          + Novo cliente
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome ou telefone..."
        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/50 mb-4"
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-text-base/50 text-center py-8">Carregando...</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-text-base/50 text-center py-8">
          {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/clientes/${customer.id}`}
                className="bg-bg-base border border-border rounded-lg p-4 flex items-center justify-between hover:border-brand-primary/40 transition-colors block"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-base truncate">{customer.name}</p>
                  {customer.phone && (
                    <p className="text-sm text-text-base/50">{formatPhoneBR(customer.phone)}</p>
                  )}
                  {customer.email && !customer.phone && (
                    <p className="text-sm text-text-base/50">{customer.email}</p>
                  )}
                </div>
                <span className="ml-3 text-sm text-brand-primary flex-shrink-0">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Tela de criar cliente (full-page overlay) */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-bg-base overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-text-base">Novo cliente</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-text-base/50 hover:text-text-base text-xl leading-none"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <CustomerForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              isLoading={isSaving}
              submitLabel="Criar cliente"
            />
          </div>
        </div>
      )}
    </div>
  );
}
