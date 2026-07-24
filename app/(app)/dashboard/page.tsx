"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/components/subscription-provider";

export default function DashboardPage() {
  const { canWrite } = useSubscription();
  const searchParams = useSearchParams();
  const acabouDePagar = searchParams.get("subscribed") === "1";

  const [confirmando, setConfirmando] = useState(acabouDePagar);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    if (!acabouDePagar) return;

    let tentativas = 0;
    const MAX = 20; // até 60s

    const poll = setInterval(async () => {
      tentativas++;
      try {
        const res = await fetch("/api/subscription");
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "active") {
          clearInterval(poll);
          setConfirmado(true);
          setConfirmando(false);
          // Recarrega para atualizar o contexto de assinatura do layout
          setTimeout(() => window.location.replace("/dashboard"), 2000);
          return;
        }
      } catch {
        // ignora erros de rede
      }
      if (tentativas >= MAX) {
        clearInterval(poll);
        setConfirmando(false);
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [acabouDePagar]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Banner pós-pagamento */}
        {confirmado && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5">
            <p className="text-green-800 font-semibold text-lg">Pagamento confirmado!</p>
            <p className="text-green-700 text-sm mt-1">Seu acesso Pro está ativo. Redirecionando...</p>
          </div>
        )}

        {confirmando && (
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-2xl px-6 py-5">
            <p className="text-brand-primary font-semibold">Confirmando pagamento...</p>
            <p className="text-text-base/60 text-sm mt-1">
              Para PIX leva alguns segundos. Para boleto, confirmaremos assim que o banco processar.
            </p>
            <div className="mt-3 h-1 bg-brand-primary/20 rounded-full overflow-hidden">
              <div className="h-1 bg-brand-primary rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-text-base">Orça Fácil</h1>
          <p className="text-text-base/60 text-lg">
            Crie orçamentos profissionais para sua marcenaria
          </p>
        </div>

        <div className="space-y-4">
          {canWrite ? (
            <Link
              href="/orcamentos/novo"
              className="block w-full bg-brand-primary hover:bg-brand-primary/90 active:bg-brand-primary/80 text-white text-xl font-semibold py-5 px-8 rounded-2xl shadow-lg transition-colors"
              aria-label="Criar novo orçamento"
            >
              + Criar orçamento
            </Link>
          ) : (
            <Link
              href="/assinar"
              className="block w-full bg-border text-text-base/40 text-xl font-semibold py-5 px-8 rounded-2xl cursor-not-allowed"
              aria-label="Assine para criar orçamentos"
              aria-disabled="true"
            >
              + Criar orçamento
            </Link>
          )}

          {!canWrite && !confirmando && !confirmado && (
            <p className="text-sm text-text-base/60">
              Seu período de teste encerrou.{" "}
              <Link href="/assinar" className="text-brand-primary underline font-medium">
                Assine agora
              </Link>{" "}
              para continuar criando orçamentos.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Link
            href="/orcamentos"
            className="flex flex-col items-center gap-2 bg-bg-base hover:bg-border/40 rounded-xl p-4 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <span className="text-sm font-medium text-text-base">Meus Orçamentos</span>
          </Link>
          <Link
            href="/clientes"
            className="flex flex-col items-center gap-2 bg-bg-base hover:bg-border/40 rounded-xl p-4 transition-colors"
          >
            <span className="text-2xl">👥</span>
            <span className="text-sm font-medium text-text-base">Clientes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
