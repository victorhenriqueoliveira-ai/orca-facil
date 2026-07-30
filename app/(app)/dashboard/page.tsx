"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/components/subscription-provider";
import type { ConversionMetrics } from "@/app/api/metrics/conversion/route";

interface DashboardStats {
  total: number;
  by_status: {
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  accepted_total_value: number;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getMesAtualInicio(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

function getMesAtualFim(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
}

export default function DashboardPage() {
  const { canWrite } = useSubscription();
  const searchParams = useSearchParams();
  const acabouDePagar = searchParams.get("subscribed") === "1";

  const [confirmando, setConfirmando] = useState(acabouDePagar);
  const [confirmado, setConfirmado] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [periodStart, setPeriodStart] = useState(getMesAtualInicio);
  const [periodEnd, setPeriodEnd] = useState(getMesAtualFim);
  const [conversion, setConversion] = useState<ConversionMetrics | null>(null);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [showGuia, setShowGuia] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchConversion() {
      setLoadingConversion(true);
      try {
        const r = await fetch(
          `/api/metrics/conversion?period_start=${periodStart}&period_end=${periodEnd}`
        );
        if (!cancelled && r.ok) {
          const data = await r.json();
          setConversion(data);
        }
      } catch {
        // ignora erros de rede
      } finally {
        if (!cancelled) setLoadingConversion(false);
      }
    }

    fetchConversion();
    return () => { cancelled = true; };
  }, [periodStart, periodEnd]);

  useEffect(() => {
    if (!acabouDePagar) return;

    let tentativas = 0;
    const MAX = 20;

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
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12">
      <div className="max-w-md w-full text-center space-y-8">

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

        {/* Métricas rápidas */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-base border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-text-base">{stats.total}</p>
              <p className="text-xs text-text-base/50 mt-0.5">Total</p>
            </div>
            <div className="bg-bg-base border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.by_status.sent}</p>
              <p className="text-xs text-text-base/50 mt-0.5">Enviados</p>
            </div>
            <div className="bg-bg-base border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.by_status.accepted}</p>
              <p className="text-xs text-text-base/50 mt-0.5">Aprovados</p>
            </div>
            {stats.accepted_total_value > 0 && (
              <div className="col-span-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-sm text-green-700 font-semibold">{formatBRL(stats.accepted_total_value)}</p>
                <p className="text-xs text-green-600 mt-0.5">em orçamentos aprovados</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 pt-4">
          <Link
            href="/orcamentos"
            className="flex flex-col items-center gap-2 bg-bg-base hover:bg-border/40 rounded-xl p-4 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <span className="text-xs font-medium text-text-base text-center">Meus Orçamentos</span>
          </Link>
          <Link
            href="/clientes"
            className="flex flex-col items-center gap-2 bg-bg-base hover:bg-border/40 rounded-xl p-4 transition-colors"
          >
            <span className="text-2xl">👥</span>
            <span className="text-xs font-medium text-text-base text-center">Clientes</span>
          </Link>
          <button
            onClick={() => setShowGuia(true)}
            className="flex flex-col items-center gap-2 bg-bg-base hover:bg-border/40 rounded-xl p-4 transition-colors"
          >
            <span className="text-2xl">💡</span>
            <span className="text-xs font-medium text-text-base text-center">Como funciona</span>
          </button>
        </div>

        {/* Modal: Como funciona */}
        {showGuia && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
            onClick={() => setShowGuia(false)}
          >
            <div
              className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-9 space-y-5 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-text-base">Como funciona o Orça Fácil</h2>
                <button
                  onClick={() => setShowGuia(false)}
                  className="text-text-base/40 hover:text-text-base transition-colors p-1"
                  aria-label="Fechar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <ol className="space-y-4">
                {[
                  {
                    n: "1",
                    titulo: "Monte seu Catálogo",
                    desc: "Cadastre os materiais e serviços que você usa com o preço unitário. Eles ficam salvos para usar em qualquer orçamento.",
                    href: "/catalogo",
                    label: "Ir ao Catálogo",
                  },
                  {
                    n: "2",
                    titulo: "Cadastre seus Clientes",
                    desc: "Salve nome, telefone e endereço dos seus clientes para agilizar na hora de criar orçamentos.",
                    href: "/clientes",
                    label: "Ver Clientes",
                  },
                  {
                    n: "3",
                    titulo: "Crie um Orçamento",
                    desc: "Escolha o cliente, adicione ambientes, insira os itens do catálogo e defina sua margem de lucro. O sistema calcula tudo.",
                    href: "/orcamentos/novo",
                    label: "Criar Orçamento",
                  },
                  {
                    n: "4",
                    titulo: "Envie o link de aprovação",
                    desc: "Gere um PDF profissional ou envie o link direto para o cliente aprovar online. Você é notificado assim que ele aprovar.",
                    href: null,
                    label: null,
                  },
                  {
                    n: "5",
                    titulo: "Acompanhe pelo Dashboard",
                    desc: "Veja quantos orçamentos foram enviados e aprovados, sua taxa de conversão e ticket médio no período.",
                    href: null,
                    label: null,
                  },
                ].map(({ n, titulo, desc, href, label }) => (
                  <li key={n} className="flex gap-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary text-sm font-bold flex items-center justify-center">
                      {n}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-text-base">{titulo}</p>
                      <p className="text-xs text-text-base/60 leading-relaxed">{desc}</p>
                      {href && label && (
                        <Link
                          href={href}
                          onClick={() => setShowGuia(false)}
                          className="inline-block text-xs text-brand-primary font-medium underline underline-offset-2 mt-0.5"
                        >
                          {label} →
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              <button
                onClick={() => setShowGuia(false)}
                className="w-full bg-brand-primary text-white text-sm font-semibold py-3 rounded-xl hover:bg-brand-primary/90 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Performance do período */}
        <div className="border border-border rounded-2xl p-5 space-y-4 text-left">
          <h2 className="text-base font-semibold text-text-base">Performance do período</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-base/50 mb-1">De</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-text-base/50 mb-1">Até</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-base bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>

          {loadingConversion ? (
            <div className="text-center text-text-base/40 text-sm py-4">Carregando...</div>
          ) : conversion ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-base border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-blue-600">
                  {conversion.sent}
                </p>
                <p className="text-xs text-text-base/50 mt-0.5">Enviados</p>
              </div>
              <div className="bg-bg-base border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-green-600">
                  {conversion.approved}
                </p>
                <p className="text-xs text-text-base/50 mt-0.5">Aprovados</p>
              </div>
              <div className="bg-bg-base border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-brand-primary">
                  {conversion.conversion_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-text-base/50 mt-0.5">Taxa de conversão</p>
              </div>
              <div className="bg-bg-base border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-text-base">
                  {formatBRL(conversion.avg_ticket)}
                </p>
                <p className="text-xs text-text-base/50 mt-0.5">Ticket médio</p>
              </div>
              <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-sm text-green-700 font-semibold">{formatBRL(conversion.total_approved)}</p>
                <p className="text-xs text-green-600 mt-0.5">Total aprovado no período</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
