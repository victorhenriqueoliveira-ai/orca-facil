import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações — Orça Fácil",
};

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
