"use client";

import { useState, useEffect } from "react";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface QuoteVersionOption {
  id: string;
  name: string;
}

export interface StepSendProps {
  quoteId: string;
  versionId: string;
  versions?: QuoteVersionOption[];
  customerName?: string;
  quoteNumber?: number;
  approvalLink?: string;
  onBack: () => void;
}

type SendState = "idle" | "generating" | "done" | "error";

// ----------------------------------------------------------------
// Template padrão
// ----------------------------------------------------------------

export const DEFAULT_WHATSAPP_TEMPLATE = `Olá, {{nome_cliente}}! Segue o orçamento #{{numero_orcamento}} da sua solicitação.

Para visualizar e aprovar com um clique, acesse:
{{link_aprovacao}}

Qualquer dúvida, estou à disposição.`;

// ----------------------------------------------------------------
// Interpolação de variáveis
// ----------------------------------------------------------------

export function interpolateTemplate(
  template: string,
  variables: {
    nome_cliente?: string;
    numero_orcamento?: number | string;
    link_aprovacao?: string;
  }
): string {
  let result = template;

  result = result.replace(
    /\{\{nome_cliente\}\}/g,
    variables.nome_cliente ?? "cliente"
  );

  result = result.replace(
    /\{\{numero_orcamento\}\}/g,
    variables.numero_orcamento != null ? String(variables.numero_orcamento) : ""
  );

  result = result.replace(
    /\{\{link_aprovacao\}\}/g,
    variables.link_aprovacao ?? ""
  );

  return result;
}

// ----------------------------------------------------------------
// StepSend — Etapa 4 do wizard: Gerar PDF e enviar pelo WhatsApp
// ----------------------------------------------------------------

export function StepSend({
  quoteId,
  versionId,
  versions = [],
  customerName,
  quoteNumber,
  approvalLink,
  onBack,
}: StepSendProps) {
  const [state, setState] = useState<SendState>("idle");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [liveApprovalLink, setLiveApprovalLink] = useState<string | undefined>(approvalLink);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"summary" | "detailed">("summary");

  // Template bruto (com variáveis) — usado para salvar no perfil
  const [rawTemplate, setRawTemplate] = useState<string>(DEFAULT_WHATSAPP_TEMPLATE);
  // Mensagem editada (interpolada) — usada para o link do WhatsApp
  const [editedMessage, setEditedMessage] = useState<string>("");
  // Estado do salvamento do modelo
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Se o template foi carregado do perfil
  const [templateLoaded, setTemplateLoaded] = useState(false);

  // Version selection: default all selected
  const allVersions: QuoteVersionOption[] =
    versions.length > 0 ? versions : [{ id: versionId, name: "Padrão" }];

  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>(
    allVersions.map((v) => v.id)
  );

  // Carregar template do perfil ao montar
  useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const profileTemplate = data?.profile?.whatsapp_message_template;
          if (profileTemplate) {
            setRawTemplate(profileTemplate);
          }
        }
      } catch {
        // Usar template padrão em caso de erro
      } finally {
        setTemplateLoaded(true);
      }
    }
    loadTemplate();
  }, []);

  // Interpolar mensagem quando template ou dados mudarem
  useEffect(() => {
    if (!templateLoaded) return;
    const interpolated = interpolateTemplate(rawTemplate, {
      nome_cliente: customerName,
      numero_orcamento: quoteNumber,
      link_aprovacao: liveApprovalLink,
    });
    setEditedMessage(interpolated);
  }, [rawTemplate, customerName, quoteNumber, liveApprovalLink, templateLoaded]);

  // When versions list changes, update selection
  useEffect(() => {
    setSelectedVersionIds(allVersions.map((v) => v.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.length]);

  function toggleVersion(id: string) {
    setSelectedVersionIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((v) => v !== id);
      }
      return [...prev, id];
    });
  }

  async function handleGeneratePdf() {
    setState("generating");
    setErrorMessage(null);
    setSignedUrl(null);

    const versionIds = selectedVersionIds.length > 0 ? selectedVersionIds : [versionId];

    try {
      const res = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, version_ids: versionIds }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? "Erro ao gerar PDF");
      }

      const data = await res.json() as {
        signed_url: string;
        approval_link?: string;
        customer_name?: string | null;
        quote_number?: number;
      };
      setSignedUrl(data.signed_url);

      // Atualiza a mensagem do WhatsApp com o link real de aprovação
      if (data.approval_link) {
        setLiveApprovalLink(data.approval_link);
        const hasPlaceholder = rawTemplate.includes("{{link_aprovacao}}");
        const interpolated = interpolateTemplate(rawTemplate, {
          nome_cliente: data.customer_name ?? customerName,
          numero_orcamento: data.quote_number ?? quoteNumber,
          link_aprovacao: data.approval_link,
        });
        // Se o template não tinha o placeholder, adiciona o link no final
        const finalMessage = hasPlaceholder
          ? interpolated
          : `${interpolated}\n\nLink para aprovação:\n${data.approval_link}`;
        setEditedMessage(finalMessage);
      }

      setState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao gerar PDF");
      setState("error");
    }
  }

  function handleWhatsApp() {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(editedMessage)}`;
    window.open(waUrl, "_blank");
  }

  async function handleSaveTemplate() {
    // Extrair o template bruto (reverter interpolação não é possível,
    // então salvamos o rawTemplate que está com as variáveis)
    setSaveState("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_message_template: rawTemplate }),
      });
      if (!res.ok) {
        throw new Error("Erro ao salvar modelo");
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
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
        <>
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
                  className="mt-0.5 accent-brand-primary"
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
                  className="mt-0.5 accent-brand-primary"
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

          {/* Version selector (shown when multiple versions exist) */}
          {allVersions.length > 1 && (
            <div className="border border-gray-200 rounded-xl bg-white p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Versões a incluir no PDF</p>
              <div className="flex flex-col gap-2">
                {allVersions.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVersionIds.includes(v.id)}
                      onChange={() => toggleVersion(v.id)}
                      className="accent-brand-primary"
                    />
                    <span className="text-sm text-gray-800">{v.name}</span>
                  </label>
                ))}
              </div>
              {selectedVersionIds.length > 1 && (
                <p className="text-xs text-brand-primary mt-2">
                  PDF comparativo será gerado com tabela de comparação entre versões.
                </p>
              )}
            </div>
          )}

          {/* Mensagem WhatsApp editável */}
          <div className="border border-gray-200 rounded-xl bg-white p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Mensagem WhatsApp</p>
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={8}
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              placeholder="Digite sua mensagem para o cliente..."
            />
            {!rawTemplate.includes("{{link_aprovacao}}") && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Seu modelo não contém <code className="bg-amber-100 px-1 rounded">{"{{link_aprovacao}}"}</code>. O link será adicionado automaticamente ao final da mensagem após gerar o PDF.
              </p>
            )}
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={saveState === "saving"}
              className="mt-2 text-xs text-brand-primary hover:text-brand-primary/80 underline transition-colors disabled:opacity-50"
            >
              {saveState === "saving"
                ? "Salvando..."
                : saveState === "saved"
                  ? "✓ Modelo salvo!"
                  : saveState === "error"
                    ? "Erro ao salvar"
                    : "Salvar como meu modelo"}
            </button>
          </div>
        </>
      )}

      {/* Generating state */}
      {state === "generating" && (
        <div className="flex flex-col items-center justify-center gap-4 py-10">
          <div
            className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"
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

          {/* Link de aprovação copiável */}
          {liveApprovalLink && (
            <div className="border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-text-base/60">Link de aprovação do cliente</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-text-base bg-bg-base border border-border rounded-lg px-3 py-2 truncate">
                  {liveApprovalLink}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(liveApprovalLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-shrink-0 text-xs font-medium text-brand-primary border border-brand-primary/30 rounded-lg px-3 py-2 hover:bg-brand-primary/5 transition-colors"
                >
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-xs text-text-base/40">
                Envie este link por qualquer canal — o cliente aprova com um clique.
              </p>
            </div>
          )}

          {/* Direct link as fallback */}
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-sm text-brand-primary underline hover:text-brand-primary/80 transition-colors"
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
          disabled={selectedVersionIds.length === 0}
          className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl px-4 py-4 text-base font-semibold transition-colors shadow-sm disabled:opacity-50"
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
