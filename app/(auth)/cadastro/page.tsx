"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaginaCadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);

  function validarSenha(value: string): string | null {
    if (value.length > 0 && value.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    // Validação local antes de chamar a API
    const erroValidacaoSenha = validarSenha(senha);
    if (erroValidacaoSenha) {
      setErroSenha(erroValidacaoSenha);
      return;
    }

    if (senha !== confirmaSenha) {
      setErroConfirmacao("As senhas não coincidem.");
      return;
    }

    setCarregando(true);

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: { name: nome.trim() },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already in use") ||
          error.message.toLowerCase().includes("email already") ||
          error.status === 422
        ) {
          setErro("Este e-mail já está em uso. Tente fazer login.");
        } else {
          setErro(error.message);
        }
        return;
      }

      window.location.href = "/dashboard";
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
          <p className="mt-2 text-text-base/70">Crie sua conta — 30 dias grátis</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="nome"
              type="text"
              label="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              required
              disabled={carregando}
            />

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
              onChange={(e) => {
                setSenha(e.target.value);
                setErroSenha(validarSenha(e.target.value));
              }}
              placeholder="Mínimo 8 caracteres"
              required
              disabled={carregando}
              error={erroSenha ?? undefined}
            />

            <Input
              id="confirma-senha"
              type="password"
              label="Confirmar senha"
              value={confirmaSenha}
              onChange={(e) => {
                setConfirmaSenha(e.target.value);
                setErroConfirmacao(null);
              }}
              placeholder="Repita a senha"
              required
              disabled={carregando}
              error={erroConfirmacao ?? undefined}
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
              disabled={
                carregando ||
                !nome.trim() ||
                !email.trim() ||
                !senha ||
                !confirmaSenha
              }
              className="w-full"
            >
              {carregando ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-base/70">
            Já tem conta?{" "}
            <a
              href="/login"
              className="text-brand-primary hover:underline font-medium"
            >
              Entrar
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
