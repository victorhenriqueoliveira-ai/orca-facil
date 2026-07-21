"use client";

import { useState } from "react";

type TipoLogin = "email" | "telefone";

export default function PaginaLogin() {
  const [tipo, setTipo] = useState<TipoLogin>("email");
  const [valor, setValor] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      // Importar o client dinamicamente para evitar execução no server-side
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      let resultado;

      if (tipo === "email") {
        resultado = await supabase.auth.signInWithOtp({
          email: valor.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });
      } else {
        // Formatar número de telefone para E.164
        const telefone = valor.trim().startsWith("+")
          ? valor.trim()
          : `+55${valor.trim().replace(/\D/g, "")}`;

        resultado = await supabase.auth.signInWithOtp({
          phone: telefone,
        });
      }

      if (resultado.error) {
        setErro(resultado.error.message);
      } else {
        setEnviado(true);
        // Redirecionar para verificação com o identificador
        const params = new URLSearchParams({ [tipo]: valor.trim() });
        window.location.href = `/auth/verify?${params.toString()}`;
      }
    } catch {
      setErro("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Orça Fácil</h1>
          <p className="mt-2 text-gray-600">Entre na sua conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Toggle de tipo */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => { setTipo("email"); setValor(""); setErro(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tipo === "email"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              E-mail
            </button>
            <button
              type="button"
              onClick={() => { setTipo("telefone"); setValor(""); setErro(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tipo === "telefone"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              WhatsApp
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="identificador"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {tipo === "email" ? "Seu e-mail" : "Seu WhatsApp"}
              </label>
              <input
                id="identificador"
                type={tipo === "email" ? "email" : "tel"}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={
                  tipo === "email"
                    ? "exemplo@email.com"
                    : "(11) 99999-9999"
                }
                required
                className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-700">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando || !valor.trim()}
              className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {carregando ? "Enviando..." : "Receber código"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-500">
            Você receberá um código de verificação para entrar.
            Sem necessidade de senha.
          </p>
        </div>
      </div>
    </div>
  );
}
