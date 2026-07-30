"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSubscription } from "@/components/subscription-provider";
import { AlertsBadge } from "@/components/alerts-badge";

const ITENS_NAV = [
  {
    href: "/orcamentos",
    label: "Orçamentos",
    icone: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="w-5 h-5"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: "/clientes",
    label: "Clientes",
    icone: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="w-5 h-5"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/catalogo",
    label: "Catálogo",
    icone: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="w-5 h-5"
      >
        <rect x="2" y="3" width="7" height="7" />
        <rect x="15" y="3" width="7" height="7" />
        <rect x="15" y="14" width="7" height="7" />
        <rect x="2" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icone: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="w-5 h-5"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const IconeLogout = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="w-5 h-5"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = "" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const subscription = useSubscription();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const trialDaysLeft =
    subscription.status === "trial" && subscription.daysLeft !== null
      ? subscription.daysLeft
      : null;

  return (
    <aside
      className={`flex-col w-64 h-screen sticky top-0 overflow-y-auto bg-white border-r border-border ${className}`}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <img
          src="/orca_facil.png"
          alt="Orça Fácil"
          className="h-20 w-auto"
        />
      </div>

      {/* Navegação principal */}
      <nav aria-label="Navegação lateral" className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {ITENS_NAV.map(({ href, label, icone }) => {
            const ativo = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    ativo
                      ? "text-brand-primary bg-brand-primary/10"
                      : "text-text-base hover:bg-bg-base"
                  }`}
                >
                  {icone}
                  <span className="flex-1">{label}</span>
                  {href === "/orcamentos" && <AlertsBadge />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Trial badge */}
      {trialDaysLeft !== null && (
        <div className="px-3 pb-3">
          <Link
            href="/assinar"
            className="block w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center hover:bg-amber-100 transition-colors"
          >
            <p className="text-xs font-semibold text-amber-700 leading-tight">
              {trialDaysLeft === 0
                ? "Trial termina hoje"
                : trialDaysLeft === 1
                  ? "1 dia restante no trial"
                  : `${trialDaysLeft} dias restantes`}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Clique para assinar</p>
          </Link>
        </div>
      )}

      {/* Rodapé — logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-base hover:bg-bg-base transition-colors cursor-pointer"
          aria-label="Sair da conta"
        >
          {IconeLogout}
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
