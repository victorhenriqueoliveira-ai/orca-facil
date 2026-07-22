import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo — Orça Fácil",
};

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
