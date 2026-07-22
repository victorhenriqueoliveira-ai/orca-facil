"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSubscription } from "@/components/subscription-provider";

interface Perfil {
  id: string;
  business_name: string | null;
  city: string | null;
  phone: string | null;
  pix_key: string | null;
  bank_info: string | null;
  logo_url: string | null;
  profit_margin_pct: number | null;
  quote_validity_days: number | null;
}

export default function ConfiguracoesPage() {
  const subscription = useSubscription();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uploadandoLogo, setUploadandoLogo] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [cancelado, setCancelado] = useState(false);
  const [erroCancelamento, setErroCancelamento] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [bankInfo, setBankInfo] = useState("");
  const [profitMarginPct, setProfitMarginPct] = useState("30");
  const [quoteValidityDays, setQuoteValidityDays] = useState("15");

  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    buscarPerfil();
  }, []);

  async function buscarPerfil() {
    setCarregando(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Falha ao carregar perfil");
      const dados = await res.json();

      if (dados.profile) {
        const p = dados.profile as Perfil;
        setPerfil(p);
        setBusinessName(p.business_name ?? "");
        setCity(p.city ?? "");
        setPhone(p.phone ?? "");
        setPixKey(p.pix_key ?? "");
        setBankInfo(p.bank_info ?? "");
        setProfitMarginPct(String(p.profit_margin_pct ?? 30));
        setQuoteValidityDays(String(p.quote_validity_days ?? 15));
      }

      if (dados.logoSignedUrl) {
        setLogoSignedUrl(dados.logoSignedUrl);
      }
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao carregar perfil" });
    } finally {
      setCarregando(false);
    }
  }

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName || null,
          city: city || null,
          phone: phone || null,
          pix_key: pixKey || null,
          bank_info: bankInfo || null,
          profit_margin_pct: Number(profitMarginPct),
          quote_validity_days: Number(quoteValidityDays),
        }),
      });

      if (!res.ok) {
        const dados = await res.json();
        throw new Error(dados.error ?? "Erro ao salvar");
      }

      setMensagem({ tipo: "sucesso", texto: "Perfil salvo com sucesso!" });
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao salvar perfil",
      });
    } finally {
      setSalvando(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setUploadandoLogo(true);
    setMensagem(null);

    try {
      const formData = new FormData();
      formData.append("logo", arquivo);

      const res = await fetch("/api/profile/logo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const dados = await res.json();
        throw new Error(dados.error ?? "Erro ao fazer upload");
      }

      const dados = await res.json();
      if (dados.logoSignedUrl) {
        setLogoSignedUrl(dados.logoSignedUrl);
      }

      setMensagem({ tipo: "sucesso", texto: "Logo atualizada com sucesso!" });
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto:
          err instanceof Error ? err.message : "Erro ao fazer upload da logo",
      });
    } finally {
      setUploadandoLogo(false);
      if (inputFileRef.current) {
        inputFileRef.current.value = "";
      }
    }
  }

  async function handleCancelarAssinatura() {
    if (
      !window.confirm(
        "Tem certeza que deseja cancelar sua assinatura? Você perderá o acesso completo ao final do período atual."
      )
    ) {
      return;
    }

    setCancelando(true);
    setErroCancelamento(null);

    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Erro ao cancelar assinatura"
        );
      }

      setCancelado(true);
    } catch (err) {
      setErroCancelamento(
        err instanceof Error ? err.message : "Erro inesperado"
      );
    } finally {
      setCancelando(false);
    }
  }

  const isActive = subscription?.status === "active";

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-gray-500 text-lg">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      {mensagem && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm font-medium ${
            mensagem.tipo === "sucesso"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Seção: Logo */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Logo da Marcenaria
        </h2>

        <div className="flex flex-col items-center gap-4">
          {logoSignedUrl ? (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
              <Image
                src={logoSignedUrl}
                alt="Logo da marcenaria"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
              aria-label="Sem logo"
            >
              <span className="text-gray-400 text-sm text-center px-2">
                Sem logo
              </span>
            </div>
          )}

          <div>
            <input
              ref={inputFileRef}
              type="file"
              id="logo-upload"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleLogoChange}
              disabled={uploadandoLogo}
            />
            <label
              htmlFor="logo-upload"
              className={`inline-flex items-center gap-2 cursor-pointer px-5 py-3 rounded-xl text-sm font-medium transition-colors ${
                uploadandoLogo
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 active:bg-brand-primary/30 border border-brand-primary/30"
              }`}
            >
              {uploadandoLogo
                ? "Enviando..."
                : logoSignedUrl
                  ? "Substituir logo"
                  : "Adicionar logo"}
            </label>
          </div>
          <p className="text-xs text-gray-500 text-center">
            JPEG, PNG ou WebP. Máximo 5MB.
          </p>
        </div>
      </section>

      {/* Seção: Dados da marcenaria */}
      <form onSubmit={salvarPerfil} className="space-y-4">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Dados da Marcenaria
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="business_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome da marcenaria
              </label>
              <input
                id="business_name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: Marcenaria do João"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cidade
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Telefone / WhatsApp
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Seção: Dados de pagamento */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Pagamento</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="pix_key"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Chave Pix
              </label>
              <input
                id="pix_key"
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="bank_info"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Dados bancários
              </label>
              <textarea
                id="bank_info"
                value={bankInfo}
                onChange={(e) => setBankInfo(e.target.value)}
                placeholder="Banco, agência, conta..."
                rows={3}
                className="w-full px-4 py-3 text-base border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </section>

        {/* Seção: Configurações padrão */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Configurações Padrão
          </h2>
          <p className="text-sm text-gray-500">
            Valores usados automaticamente ao criar novos orçamentos.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="profit_margin_pct"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Margem de lucro padrão (%)
              </label>
              <input
                id="profit_margin_pct"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={profitMarginPct}
                onChange={(e) => setProfitMarginPct(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="quote_validity_days"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Prazo de validade do orçamento (dias)
              </label>
              <input
                id="quote_validity_days"
                type="number"
                min="1"
                step="1"
                value={quoteValidityDays}
                onChange={(e) => setQuoteValidityDays(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={salvando}
          className={`w-full py-4 rounded-2xl text-white text-lg font-semibold transition-colors ${
            salvando
              ? "bg-brand-primary/40 cursor-not-allowed"
              : "bg-brand-primary hover:bg-brand-primary/90 active:bg-brand-primary/80"
          }`}
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {/* Seção: Assinatura */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Assinatura</h2>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <span
            className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              isActive
                ? "bg-green-100 text-green-700"
                : subscription?.status === "trial"
                  ? "bg-brand-support/10 text-brand-support"
                  : subscription?.status === "cancelled"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-red-100 text-red-700"
            }`}
          >
            {isActive
              ? "Ativo"
              : subscription?.status === "trial"
                ? "Trial"
                : subscription?.status === "cancelled"
                  ? "Cancelado"
                  : "Somente leitura"}
          </span>
        </div>

        {isActive && !cancelado && (
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <p className="text-sm text-gray-500">
              Você pode cancelar sua assinatura a qualquer momento. O acesso
              completo continua até o final do período pago.
            </p>

            {erroCancelamento && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {erroCancelamento}
              </div>
            )}

            <button
              type="button"
              onClick={handleCancelarAssinatura}
              disabled={cancelando}
              className="text-sm text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelando ? "Cancelando..." : "Cancelar assinatura"}
            </button>
          </div>
        )}

        {cancelado && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            Assinatura cancelada com sucesso. Seu acesso completo permanece até
            o fim do período atual.
          </div>
        )}

        {!isActive && subscription?.status === "trial" && (
          <div className="pt-2">
            <a
              href="/assinar"
              className="text-sm text-brand-primary underline hover:text-brand-primary/80"
            >
              Assinar o plano Pro — R$ 49/mês
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
