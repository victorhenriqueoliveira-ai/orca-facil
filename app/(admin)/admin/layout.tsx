import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/auth";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    notFound();
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-52 shrink-0 bg-white border-r border-border flex-col">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-text-base/50 uppercase tracking-widest">
            Admin
          </p>
          <p className="text-sm font-bold text-text-base mt-0.5">Orça Fácil</p>
        </div>
        <AdminNav />
        <div className="px-3 py-4 border-t border-border">
          <Link
            href="/dashboard"
            className="block px-3 py-2 text-sm text-text-base/60 hover:text-text-base rounded-lg hover:bg-bg-base transition-colors"
          >
            ← Voltar ao app
          </Link>
        </div>
      </aside>

      {/* Layout principal */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header — mobile */}
        <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-text-base/50 uppercase tracking-widest">Admin</p>
              <p className="text-sm font-bold text-text-base leading-tight">Orça Fácil</p>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-text-base/50 hover:text-text-base transition-colors"
            >
              ← App
            </Link>
          </div>
          <div className="flex overflow-x-auto pb-2 px-2 gap-1 scrollbar-none">
            <AdminNav />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
