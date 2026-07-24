"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar nav */}
      <nav className="hidden lg:flex flex-1 px-3 py-4 flex-col gap-1">
        {LINKS.map(({ href, label }) => {
          const ativo = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                ativo
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-text-base hover:bg-bg-base"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile top nav */}
      <nav className="lg:hidden flex gap-1 px-2">
        {LINKS.map(({ href, label }) => {
          const ativo = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                ativo
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-text-base hover:bg-bg-base"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
