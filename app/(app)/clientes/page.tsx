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

type ModalMode = "create" | "edit" | null;

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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

  // Debounce 300ms para busca em tempo real
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchCustomers]);

  async function handleCreate(data: CustomerFormData) {
    setIsSaving(true);
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
      setModalMode(null);
      fetchCustomers(search);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(data: CustomerFormData) {
    if (!editingCustomer) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao editar cliente");
      }
      setModalMode(null);
      setEditingCustomer(null);
      fetchCustomers(search);
    } finally {
      setIsSaving(false);
    }
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingCustomer(null);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => setModalMode("create")}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Novo cliente
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome ou telefone..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500 text-center py-8">Carregando...</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {customers.map((customer) => (
            <li
              key={customer.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <Link href={`/clientes/${customer.id}`} className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                {customer.phone && (
                  <p className="text-sm text-gray-500">{formatPhoneBR(customer.phone)}</p>
                )}
                {customer.email && !customer.phone && (
                  <p className="text-sm text-gray-500">{customer.email}</p>
                )}
              </Link>
              <button
                onClick={() => openEdit(customer)}
                className="ml-3 text-sm text-blue-600 hover:text-blue-800 flex-shrink-0"
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Modal / Bottom sheet */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-base font-semibold text-gray-900">
                {modalMode === "create" ? "Novo cliente" : "Editar cliente"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <CustomerForm
              initialData={
                editingCustomer
                  ? {
                      name: editingCustomer.name,
                      phone: editingCustomer.phone ?? "",
                      email: editingCustomer.email ?? "",
                      address: editingCustomer.address ?? "",
                      notes: editingCustomer.notes ?? "",
                    }
                  : undefined
              }
              onSubmit={modalMode === "create" ? handleCreate : handleEdit}
              onCancel={closeModal}
              isLoading={isSaving}
              submitLabel={modalMode === "create" ? "Criar cliente" : "Salvar alterações"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
