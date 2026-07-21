"use client";

import { useState, useEffect, useRef } from "react";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface StepClientProps {
  onNext: (customerId: string | null) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Etapa 1 do wizard: busca e seleção de cliente, ou criação inline.
 * Ao confirmar, chama onNext com o customerId selecionado (ou null para avulso).
 */
export function StepClient({ onNext, isLoading = false }: StepClientProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Criação inline
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce na busca
  useEffect(() => {
    if (showCreateForm || selectedCustomer) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch {
        // ignore search errors
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, showCreateForm, selectedCustomer]);

  async function handleCreateCustomer() {
    if (!newName.trim()) {
      setCreateError("Nome é obrigatório");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), phone: newPhone || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        setCreateError(err.error ?? "Erro ao criar cliente");
        return;
      }
      const customer = await res.json();
      setSelectedCustomer(customer);
      setShowCreateForm(false);
      setQuery("");
      setResults([]);
    } catch {
      setCreateError("Erro ao criar cliente");
    } finally {
      setCreating(false);
    }
  }

  async function handleNext() {
    setError(null);
    try {
      await onNext(selectedCustomer?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao avançar");
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Cliente</h2>
        <p className="text-sm text-gray-500">
          Busque um cliente existente ou cadastre um novo.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
      )}

      {!selectedCustomer && !showCreateForm && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente por nome ou telefone..."
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searching && (
              <span className="absolute right-3 top-3 text-xs text-gray-400">
                Buscando...
              </span>
            )}
          </div>

          {results.length > 0 && (
            <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setQuery("");
                      setResults([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    {c.phone && (
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Cadastrar novo cliente
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="w-full bg-gray-100 text-gray-600 rounded-lg px-4 py-3 text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Continuar sem cliente
            </button>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="flex flex-col gap-4 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700">Novo cliente</h3>

          {createError && (
            <p className="text-sm text-red-600 bg-red-50 rounded p-2">{createError}</p>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do cliente"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="tel"
              inputMode="numeric"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewName("");
                setNewPhone("");
                setCreateError(null);
              }}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateCustomer}
              disabled={creating}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{selectedCustomer.name}</p>
              {selectedCustomer.phone && (
                <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Trocar
            </button>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Salvando..." : "Avançar →"}
          </button>
        </div>
      )}

      {!selectedCustomer && !showCreateForm && (
        <></>
      )}
    </div>
  );
}
