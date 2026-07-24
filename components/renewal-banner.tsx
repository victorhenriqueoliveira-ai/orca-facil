"use client";

export function RenewalBanner() {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full bg-red-600 text-white text-sm font-medium text-center py-2 px-4"
    >
      Sua assinatura expirou. Renove agora para continuar usando —{" "}
      <a href="/assinar" className="underline font-bold hover:text-red-100">
        Renovar assinatura
      </a>
    </div>
  );
}
