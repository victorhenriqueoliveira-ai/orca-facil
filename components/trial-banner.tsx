"use client";

interface TrialBannerProps {
  daysLeft: number;
}

/**
 * Banner fixo no topo exibido quando o usuário está em período de trial.
 * Recebe daysLeft como prop — o cálculo é feito no servidor.
 */
export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const texto =
    daysLeft === 1
      ? "Seu período de teste termina amanhã!"
      : daysLeft === 0
        ? "Seu período de teste termina hoje!"
        : `Seu período de teste termina em ${daysLeft} dias`;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full bg-amber-500 text-white text-sm font-medium text-center py-2 px-4"
    >
      {texto} —{" "}
      <a href="/assinar" className="underline font-bold hover:text-amber-100">
        Assine agora
      </a>{" "}
      para continuar usando.
    </div>
  );
}
