"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Página de conversão de trial → assinatura paga.
 * Exibe preço, benefícios e botão de checkout AbacatePay.
 */
export default function AssinarPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Erro ao iniciar checkout"
        );
      }

      const { checkout_url } = (await res.json()) as { checkout_url: string };
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="text-6xl">🚀</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Assine o Orça Fácil Pro
          </h1>
          <p className="text-gray-500 text-base">
            Continue criando orçamentos profissionais, gerenciando clientes e
            gerando PDFs sem limitações.
          </p>
        </div>

        {/* Preço */}
        <div className="text-center">
          <span className="text-5xl font-extrabold text-blue-600">R$ 49</span>
          <span className="text-gray-500 text-lg">/mês</span>
          <p className="text-sm text-gray-400 mt-1">
            Pagamento via Pix ou cartão de crédito
          </p>
        </div>

        {/* Benefícios */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-blue-900">
            O que está incluso
          </h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Orçamentos ilimitados
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Geração de PDFs profissionais
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Gestão de clientes e catálogo de produtos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Histórico completo de orçamentos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Suporte prioritário
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Cancele quando quiser, sem multa
            </li>
          </ul>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          aria-label="Assinar agora"
          className="w-full bg-blue-600 text-white text-xl font-semibold py-5 px-8 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Aguarde..." : "Assinar agora — R$ 49/mês"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Pagamento seguro via AbacatePay (Pix e cartão). Cancele quando quiser.
        </p>

        <div className="text-center">
          <Link
            href="/orcamentos"
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Ver orçamentos existentes (somente leitura)
          </Link>
        </div>
      </div>
    </div>
  );
}
