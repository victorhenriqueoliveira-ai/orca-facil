"use client";

import { createContext, useContext } from "react";
import type { SubscriptionInfo } from "@/lib/subscription/get-status";

export type { SubscriptionInfo };

const SubscriptionContext = createContext<SubscriptionInfo>({
  status: "read_only",
  daysLeft: null,
  canWrite: false,
  trialEndsAt: null,
});

interface SubscriptionProviderProps {
  subscription: SubscriptionInfo;
  children: React.ReactNode;
}

/**
 * Client Component que provê o contexto de assinatura para todos os filhos.
 * Os dados são passados pelo Server Component do layout.
 */
export function SubscriptionProvider({
  subscription,
  children,
}: SubscriptionProviderProps) {
  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook para acessar o contexto de assinatura em Client Components.
 * Expõe { status, daysLeft, canWrite, trialEndsAt }.
 */
export function useSubscription(): SubscriptionInfo {
  return useContext(SubscriptionContext);
}
