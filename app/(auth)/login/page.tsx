"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaginaLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
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
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="text-center">
            <div className="flex items-center justify-center sm:gap-3">
              <img
                src="/orca_facil.png"
                alt="Orça Fácil"
                className="h-[100px] w-auto sm:h-[200px]"
              />
            </div>
          </div>
          <p className="text-text-base/70 font-bold text-center mb-6">Entre na sua conta</p>
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

            <div className="relative">
              <Input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                label="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                required
                disabled={carregando}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                disabled={carregando}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-[34px] text-text-base/55 hover:text-text-base disabled:pointer-events-none disabled:opacity-50"
              >
                {mostrarSenha ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.62 21.62 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.62 21.62 0 0 1-3.22 4.55M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

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
              className="w-full cursor-pointer"
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
          <div className="mt-4 text-center space-y-2">
            <a
              href="/"
              className="block text-sm text-black underline"
            >
              Voltar para a página inicial
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
