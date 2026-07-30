"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlertsResponse } from "@/app/api/alerts/route";

const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

async function loadAlerts(): Promise<number> {
  try {
    const res = await fetch("/api/alerts", { cache: "no-store" });
    if (!res.ok) return 0;
    const data: AlertsResponse = await res.json();
    return (
      (data.approved?.length ?? 0) +
      (data.followup?.length ?? 0) +
      (data.expiring?.length ?? 0)
    );
  } catch {
    return 0;
  }
}

/**
 * Badge de alertas in-app.
 * Faz fetch de /api/alerts no mount e a cada 5 minutos.
 * Exibe o total de alertas em um círculo vermelho, visível somente quando > 0.
 */
export function AlertsBadge() {
  const [total, setTotal] = useState<number>(0);

  const refresh = useCallback(() => {
    loadAlerts().then(setTotal).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REVALIDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  if (total === 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full leading-none"
      aria-label={`${total} alerta${total !== 1 ? "s" : ""} pendente${total !== 1 ? "s" : ""}`}
    >
      {total > 99 ? "99+" : total}
    </span>
  );
}
