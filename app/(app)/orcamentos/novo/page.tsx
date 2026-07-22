"use client";

import { useReducer } from "react";
import { useRouter } from "next/navigation";
import { StepClient } from "@/components/wizard/step-client";
import { StepRooms, type Room } from "@/components/wizard/step-rooms";
import { StepReview } from "@/components/wizard/step-review";
import { StepSend } from "@/components/wizard/step-send";

// ----------------------------------------------------------------
// Estado do wizard
// ----------------------------------------------------------------

interface WizardState {
  step: 1 | 2 | 3 | 4;
  quoteId: string | null;
  versionId: string | null;
  customerId: string | null;
  quoteNumber: number | null;
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
}

type WizardAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | {
      type: "QUOTE_CREATED";
      payload: { quoteId: string; versionId: string; quoteNumber: number; customerId: string | null };
    }
  | { type: "GO_TO_STEP"; payload: 1 | 2 | 3 | 4 }
  | { type: "ROOMS_CONFIRMED"; payload: Room[] };

const initialState: WizardState = {
  step: 1,
  quoteId: null,
  versionId: null,
  customerId: null,
  quoteNumber: null,
  rooms: [],
  isLoading: false,
  error: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    case "QUOTE_CREATED":
      return {
        ...state,
        quoteId: action.payload.quoteId,
        versionId: action.payload.versionId,
        customerId: action.payload.customerId,
        quoteNumber: action.payload.quoteNumber,
        step: 2,
        isLoading: false,
        error: null,
      };
    case "GO_TO_STEP":
      return { ...state, step: action.payload, error: null };
    case "ROOMS_CONFIRMED":
      return { ...state, rooms: action.payload, step: 3, error: null };
    default:
      return state;
  }
}

// ----------------------------------------------------------------
// Barra de progresso
// ----------------------------------------------------------------

const STEP_LABELS = ["Cliente", "Ambientes", "Resumo", "Envio"];

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 px-4 py-3 border-b border-gray-200 bg-white">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isDone ? "✓" : stepNum}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isActive ? "text-blue-600 font-medium" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>

            {idx < STEP_LABELS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-4 transition-colors ${
                  stepNum < currentStep ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------
// Página principal do wizard
// ----------------------------------------------------------------

export default function NovoOrcamentoPage() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const router = useRouter();

  // Etapa 1 → 2: criar orçamento no banco
  async function handleClientNext(customerId: string | null) {
    // Reutilizar quoteId se já foi criado (navegação para trás/frente)
    if (state.quoteId && state.versionId) {
      dispatch({ type: "GO_TO_STEP", payload: 2 });
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });

    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customerId }),
    });

    if (!res.ok) {
      const err = await res.json();
      dispatch({ type: "SET_ERROR", payload: err.error ?? "Erro ao criar orçamento" });
      return;
    }

    const { quote_id, version_id, quote_number } = await res.json();
    dispatch({
      type: "QUOTE_CREATED",
      payload: { quoteId: quote_id, versionId: version_id, quoteNumber: quote_number, customerId },
    });
  }

  // Etapa 2 → 3: confirmar ambientes
  function handleRoomsNext(rooms: Room[]) {
    dispatch({ type: "ROOMS_CONFIRMED", payload: rooms });
  }

  // Voltar da etapa 2 para 1
  function handleRoomsBack() {
    dispatch({ type: "GO_TO_STEP", payload: 1 });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 p-1"
          aria-label="Voltar"
        >
          ←
        </button>
        <h1 className="text-base font-semibold text-gray-800">
          Novo Orçamento
          {state.quoteNumber ? ` #${state.quoteNumber}` : ""}
        </h1>
      </div>

      {/* Barra de progresso */}
      <ProgressBar currentStep={state.step} />

      {/* Erro global */}
      {state.error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Conteúdo das etapas */}
      <div className="flex-1 overflow-y-auto">
        {state.step === 1 && (
          <StepClient onNext={handleClientNext} isLoading={state.isLoading} />
        )}

        {state.step === 2 && state.quoteId && state.versionId && (
          <StepRooms
            quoteId={state.quoteId}
            versionId={state.versionId}
            onNext={handleRoomsNext}
            onBack={handleRoomsBack}
          />
        )}

        {state.step === 3 && state.quoteId && state.versionId && (
          <StepReview
            quoteId={state.quoteId}
            versionId={state.versionId}
            onNext={() => dispatch({ type: "GO_TO_STEP", payload: 4 })}
            onBack={() => dispatch({ type: "GO_TO_STEP", payload: 2 })}
          />
        )}

        {state.step === 4 && state.quoteId && state.versionId && (
          <StepSend
            quoteId={state.quoteId}
            versionId={state.versionId}
            onBack={() => dispatch({ type: "GO_TO_STEP", payload: 3 })}
          />
        )}
      </div>
    </div>
  );
}
