"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaginaRedefinirSenha() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${origin}/api/auth/callback?next=/nova-senha`,
        }
      );

      if (error) {
        setErro(error.message);
      } else {
        setEnviado(true);
      }
    } catch {
      setErro("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-base">Redefinir senha</h1>
          <p className="mt-2 text-text-base/70">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          {enviado ? (
            <div role="status" className="text-center space-y-4">
              <div className="text-green-600 text-5xl">✓</div>
              <p className="text-text-base font-medium">Verifique seu e-mail</p>
              <p className="text-sm text-text-base/70">
                Enviamos um link para <strong>{email}</strong>. Clique no link
                para definir sua nova senha.
              </p>
              <a
                href="/login"
                className="block text-sm text-brand-primary hover:underline"
              >
                Voltar ao login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                type="email"
                label="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                required
                disabled={carregando}
              />

              {erro && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 rounded-lg p-3"
                >
                  <p className="text-sm text-red-700">{erro}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={carregando || !email.trim()}
                className="w-full"
              >
                {carregando ? "Enviando..." : "Enviar link"}
              </Button>

              <p className="text-center text-sm text-text-base/70">
                <a
                  href="/login"
                  className="text-brand-primary hover:underline"
                >
                  Voltar ao login
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
