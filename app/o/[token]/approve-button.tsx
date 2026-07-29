"use client";

import { useState } from "react";

interface ApproveButtonProps {
  quoteId: string;
  token: string;
}

type ButtonState = "idle" | "loading" | "done" | "error";

export function ApproveButton({ quoteId, token }: ApproveButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleApprove() {
    setState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/quotes/${quoteId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setState("done");
      } else {
        const body = await res.json().catch(() => ({}));
        const msg =
          res.status === 409
            ? "Este orçamento já foi aprovado ou o link expirou."
            : (body.error ?? "Não foi possível aprovar o orçamento. Tente novamente.");
        setErrorMessage(msg);
        setState("error");
      }
    } catch {
      setErrorMessage("Erro de conexão. Verifique sua internet e tente novamente.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="w-full text-center py-4 px-6 rounded-xl bg-green-50 border border-green-200">
        <span className="text-green-700 font-semibold text-lg">✓ Aprovado!</span>
        <p className="text-green-600 text-sm mt-1">
          O marceneiro foi notificado sobre a aprovação.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={handleApprove}
        disabled={state === "loading"}
        className="w-full py-4 px-6 rounded-xl bg-[#2D5D5A] text-white font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
      >
        {state === "loading" ? "Aprovando..." : "Aprovar orçamento"}
      </button>
      {state === "error" && errorMessage && (
        <p className="mt-2 text-sm text-red-600 text-center">{errorMessage}</p>
      )}
    </div>
  );
}
