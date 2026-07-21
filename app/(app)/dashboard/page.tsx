"use client";

import Link from "next/link";
import { useSubscription } from "@/components/subscription-provider";

/**
 * Tela inicial do dashboard com o botão principal "Criar orçamento".
 * Se o usuário está em read_only ou cancelled, desabilita o botão
 * e redireciona para /assinar.
 */
export default function DashboardPage() {
  const { canWrite } = useSubscription();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Orça Fácil</h1>
          <p className="text-gray-500 text-lg">
            Crie orçamentos profissionais para sua marcenaria
          </p>
        </div>

        <div className="space-y-4">
          {canWrite ? (
            <Link
              href="/orcamentos/novo"
              className="block w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xl font-semibold py-5 px-8 rounded-2xl shadow-lg transition-colors"
              aria-label="Criar novo orçamento"
            >
              + Criar orçamento
            </Link>
          ) : (
            <Link
              href="/assinar"
              className="block w-full bg-gray-300 text-gray-500 text-xl font-semibold py-5 px-8 rounded-2xl cursor-not-allowed"
              aria-label="Assine para criar orçamentos"
              aria-disabled="true"
            >
              + Criar orçamento
            </Link>
          )}

          {!canWrite && (
            <p className="text-sm text-gray-500">
              Seu período de teste encerrou.{" "}
              <Link href="/assinar" className="text-blue-600 underline font-medium">
                Assine agora
              </Link>{" "}
              para continuar criando orçamentos.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Link
            href="/orcamentos"
            className="flex flex-col items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <span className="text-sm font-medium text-gray-700">Meus Orçamentos</span>
          </Link>
          <Link
            href="/clientes"
            className="flex flex-col items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors"
          >
            <span className="text-2xl">👥</span>
            <span className="text-sm font-medium text-gray-700">Clientes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
