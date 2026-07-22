"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaginaLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        setErro(
          "Email ou senha inválidos. Se você acessava via código antes, use 'Esqueci minha senha' para definir uma senha."
        );
      } else {
        window.location.href = "/dashboard";
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
          <h1 className="text-3xl font-bold text-text-base">Orça Fácil</h1>
          <p className="mt-2 text-text-base/70">Entre na sua conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
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

            <Input
              id="senha"
              type="password"
              label="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
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
              disabled={carregando || !email.trim() || !senha}
              className="w-full"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <a
              href="/redefinir-senha"
              className="block text-sm text-brand-primary hover:underline"
            >
              Esqueci minha senha
            </a>
            <p className="text-sm text-text-base/70">
              Não tem conta?{" "}
              <a
                href="/cadastro"
                className="text-brand-primary hover:underline font-medium"
              >
                Cadastre-se
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
