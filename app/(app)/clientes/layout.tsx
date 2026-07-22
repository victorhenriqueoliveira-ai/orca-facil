import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clientes — Orça Fácil",
};

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
