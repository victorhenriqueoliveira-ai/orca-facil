"use client";

import { useEffect, useState } from "react";
import type { RegionalItem } from "@/lib/catalog/regional-defaults";

const ONBOARDING_SKIPPED_KEY = "catalog_onboarding_skipped";

interface RegionalSuggestionsResponse {
  suggestions: RegionalItem[];
  uf: string | null;
}

interface CatalogRegionalOnboardingProps {
  /** Chamado após importação bem-sucedida ou skip, para que a página pai atualize o catálogo */
  onDismiss: () => void;
}

/**
 * Banner de onboarding de catálogo regional.
 * Exibido apenas quando o usuário não tem itens no catálogo E não pulou anteriormente.
 * A condição "não tem itens" é controlada pela página pai; este componente gerencia o estado "pulado".
 */
export function CatalogRegionalOnboarding({ onDismiss }: CatalogRegionalOnboardingProps) {
  const [suggestions, setSuggestions] = useState<RegionalItem[]>([]);
  const [uf, setUf] = useState<string | null>(null);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const res = await fetch("/api/catalog/regional-suggestions");
        if (!res.ok) throw new Error("Erro ao carregar sugestões");
        const data: RegionalSuggestionsResponse = await res.json();
        setSuggestions(data.suggestions);
        setUf(data.uf);
        // Marca todos como selecionados por padrão
        setSelectedNames(new Set(data.suggestions.map((s) => s.name)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar sugestões");
      } finally {
        setLoading(false);
      }
    }
    fetchSuggestions();
  }, []);

  function handleToggle(name: string) {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function handleSkip() {
    try {
      localStorage.setItem(ONBOARDING_SKIPPED_KEY, "true");
    } catch {
      // Ignora erros de localStorage (modo privado, etc.)
    }
    onDismiss();
  }

  async function handleImport() {
    if (selectedNames.size === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog/regional-suggestions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_ids: Array.from(selectedNames) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao importar itens");
      }
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar itens");
    } finally {
      setImporting(false);
    }
  }

  if (loading) return null;
  if (!suggestions.length) return null;

  return (
    <div
      className="mb-6 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4"
      role="region"
      aria-label="Sugestões de catálogo regional"
      data-testid="catalog-regional-onboarding"
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-text-base">
          Catálogo pré-preenchido{uf ? ` para ${uf}` : ""}
        </h2>
        <p className="mt-1 text-xs text-text-base/60">
          Selecionamos itens típicos da sua região. Importe os que quiser ou pule por agora.
        </p>
      </div>

      {error && (
        <p className="mb-3 text-xs text-error" role="alert">
          {error}
        </p>
      )}

      <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto">
        {suggestions.map((item) => (
          <li key={item.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`suggestion-${item.name}`}
              checked={selectedNames.has(item.name)}
              onChange={() => handleToggle(item.name)}
              className="h-4 w-4 rounded border-border text-brand-primary"
              aria-label={`Selecionar ${item.name}`}
            />
            <label
              htmlFor={`suggestion-${item.name}`}
              className="flex-1 cursor-pointer text-xs text-text-base"
            >
              <span className="font-medium">{item.name}</span>
              <span className="ml-1 text-text-base/50">
                {item.unit} ·{" "}
                {item.unit_price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button
          onClick={handleImport}
          disabled={importing || selectedNames.size === 0}
          className="flex-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          aria-label="Importar itens selecionados"
        >
          {importing ? "Importando..." : `Importar selecionados (${selectedNames.size})`}
        </button>
        <button
          onClick={handleSkip}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-base/60 hover:bg-border/30"
          aria-label="Pular onboarding por agora"
          data-testid="skip-onboarding"
        >
          Pular por agora
        </button>
      </div>
    </div>
  );
}

/**
 * Verifica se o onboarding de catálogo regional deve ser exibido.
 * Retorna false se o usuário já pulou anteriormente via localStorage.
 */
export function shouldShowCatalogOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SKIPPED_KEY) !== "true";
  } catch {
    return true;
  }
}
