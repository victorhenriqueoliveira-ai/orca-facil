"use client";

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

function FormularioVerificacao() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const telefone = searchParams.get("telefone");

  const [codigo, setCodigo] = useState(["", "", "", "", "", ""]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focar no primeiro campo ao montar
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigit(index: number, valor: string) {
    // Aceitar apenas dígitos
    const digito = valor.replace(/\D/g, "").slice(-1);
    const novoCodigo = [...codigo];
    novoCodigo[index] = digito;
    setCodigo(novoCodigo);

    // Avançar para próximo campo se digitou um dígito
    if (digito && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Verificar automaticamente quando todos os 6 dígitos forem preenchidos
    if (digito && index === 5 && novoCodigo.every((d) => d !== "")) {
      verificarCodigo(novoCodigo.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !codigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const texto = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (texto.length === 6) {
      const novoCodigo = texto.split("");
      setCodigo(novoCodigo);
      inputRefs.current[5]?.focus();
      verificarCodigo(texto);
    }
  }

  async function verificarCodigo(otp: string) {
    setErro(null);
    setCarregando(true);

    try {
      // Importar o client dinamicamente para evitar execução no server-side
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      let resultado;

      if (email) {
        resultado = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });
      } else if (telefone) {
        resultado = await supabase.auth.verifyOtp({
          phone: telefone,
          token: otp,
          type: "sms",
        });
      } else {
        setErro("Identificador de login não encontrado. Volte e tente novamente.");
        setCarregando(false);
        return;
      }

      if (resultado.error) {
        const mensagem = resultado.error.message;
        if (
          mensagem.toLowerCase().includes("expired") ||
          mensagem.toLowerCase().includes("expirado")
        ) {
          setErro(
            "O código expirou. Volte para a tela de login e solicite um novo código."
          );
        } else if (
          mensagem.toLowerCase().includes("invalid") ||
          mensagem.toLowerCase().includes("inválido")
        ) {
          setErro(
            "Código inválido. Verifique os dígitos e tente novamente."
          );
        } else {
          setErro(
            `Erro ao verificar o código: ${mensagem}. Tente novamente.`
          );
        }
        setCodigo(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        // Login bem-sucedido — redirecionar para o dashboard
        window.location.href = "/dashboard";
      }
    } catch {
      setErro("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const otp = codigo.join("");
    if (otp.length === 6) {
      await verificarCodigo(otp);
    }
  }

  const identificador = email || telefone;
  const tipoIdentificador = email ? "e-mail" : "WhatsApp";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {identificador && (
        <p className="text-center text-gray-600 mb-6">
          Digite o código enviado para o seu {tipoIdentificador}
          <br />
          <span className="font-medium text-gray-900">{identificador}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos do OTP */}
        <div className="flex justify-center gap-3">
          {codigo.map((digito, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digito}
              onChange={(e) => handleDigit(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={carregando}
              className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 disabled:opacity-50"
              aria-label={`Dígito ${index + 1} do código`}
            />
          ))}
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={carregando || codigo.some((d) => d === "")}
          className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {carregando ? "Verificando..." : "Entrar"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <a
          href="/login"
          className="text-sm text-blue-600 hover:text-blue-700 underline"
        >
          Não recebi o código — tentar novamente
        </a>
      </div>
    </div>
  );
}

export default function PaginaVerificar() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Verificar código</h1>
        </div>

        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-gray-500">Carregando...</p>
            </div>
          }
        >
          <FormularioVerificacao />
        </Suspense>
      </div>
    </div>
  );
}
