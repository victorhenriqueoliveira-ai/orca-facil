"use client";

import { useState } from "react";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface StepSendProps {
  quoteId: string;
  versionId: string;
  customerName?: string;
  onBack: () => void;
}

type SendState = "idle" | "generating" | "done" | "error";

// ----------------------------------------------------------------
// StepSend — Etapa 4 do wizard: Gerar PDF e enviar pelo WhatsApp
// ----------------------------------------------------------------

export function StepSend({ quoteId, versionId, customerName, onBack }: StepSendProps) {
  const [state, setState] = useState<SendState>("idle");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"summary" | "detailed">("summary");

  async function handleGeneratePdf() {
    setState("generating");
    setErrorMessage(null);
    setSignedUrl(null);

    try {
      const res = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, version_ids: [versionId] }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? "Erro ao gerar PDF");
      }

      const data = await res.json();
      setSignedUrl(data.signed_url);
      setState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao gerar PDF");
      setState("error");
    }
  }

  function handleWhatsApp() {
    if (!signedUrl) return;

    const name = customerName ?? "cliente";
    const text = `Segue o orçamento da ${name}: ${encodeURIComponent(signedUrl)}`;
    const waUrl = `https://wa.me/?text=Segue+o+orçamento+da+${encodeURIComponent(name)}%3A+${encodeURIComponent(signedUrl)}`;

    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: "Orçamento",
          text: `Segue o orçamento da ${name}`,
          url: signedUrl,
        })
        .catch(() => {
          // Fallback to WhatsApp deep link if share fails
          window.open(waUrl, "_blank");
        });
      return;
    }

    // Suppress unused variable warning
    void text;

    // Direct WhatsApp link
    window.open(waUrl, "_blank");
  }

  function handleRetry() {
    setState("idle");
    setErrorMessage(null);
    setSignedUrl(null);
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-8">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Enviar orçamento</h2>
        <p className="text-sm text-gray-500">
          Gere o PDF e envie pelo WhatsApp com um toque.
        </p>
      </div>

      {/* Mode selector */}
      {state === "idle" && (
        <div className="border border-gray-200 rounded-xl bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Modo do PDF</p>
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="pdf-mode"
                value="summary"
                checked={mode === "summary"}
                onChange={() => setMode("summary")}
                className="mt-0.5 accent-blue-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">Resumido</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mostra total por ambiente. Ideal para apresentação rápida ao cliente.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="pdf-mode"
                value="detailed"
                checked={mode === "detailed"}
                onChange={() => setMode("detailed")}
                className="mt-0.5 accent-blue-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">Detalhado</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lista todos os itens com preços unitários e quantidades.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Generating state */}
      {state === "generating" && (
        <div className="flex flex-col items-center justify-center gap-4 py-10">
          <div
            className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
            role="status"
            aria-label="Carregando"
          />
          <p className="text-sm text-gray-600 font-medium">Gerando PDF...</p>
          <p className="text-xs text-gray-400 text-center max-w-xs">
            Isso pode levar alguns segundos. Não feche esta página.
          </p>
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-medium text-red-700 mb-1">Erro ao gerar PDF</p>
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Done state */}
      {state === "done" && signedUrl && (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm font-semibold text-green-700">PDF gerado com sucesso!</p>
            <p className="text-xs text-green-600 mt-1">
              Link válido por 7 dias.
            </p>
          </div>

          {/* WhatsApp button */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 py-4 text-base font-semibold transition-colors shadow-sm"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar pelo WhatsApp
          </button>

          {/* Direct link as fallback */}
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-sm text-blue-600 underline hover:text-blue-800 transition-colors"
          >
            Ou abrir/baixar o PDF diretamente
          </a>

          {/* Generate another */}
          <button
            type="button"
            onClick={handleRetry}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Gerar novo PDF
          </button>
        </div>
      )}

      {/* Generate PDF button (idle state) */}
      {state === "idle" && (
        <button
          type="button"
          onClick={handleGeneratePdf}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-4 text-base font-semibold transition-colors shadow-sm"
        >
          Gerar PDF
        </button>
      )}

      {/* Back button */}
      {(state === "idle" || state === "done") && (
        <button
          type="button"
          onClick={onBack}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Voltar
        </button>
      )}
    </div>
  );
}
