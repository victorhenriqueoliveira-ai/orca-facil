import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assinar — Orça Fácil",
};

export default function AssinarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
