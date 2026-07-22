"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PaginaNovaSenha() {
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  function validarSenha(value: string): string | null {
    if (value.length > 0 && value.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    // Validação local
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

      const { error } = await supabase.auth.updateUser({ password: senha });

      if (error) {
        setErro(error.message);
      } else {
        setConcluido(true);
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
          <h1 className="text-3xl font-bold text-text-base">Nova senha</h1>
          <p className="mt-2 text-text-base/70">
            Defina sua nova senha de acesso.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          {concluido ? (
            <div role="status" className="text-center space-y-4">
              <div className="text-green-600 text-5xl">✓</div>
              <p className="text-text-base font-medium">
                Senha definida com sucesso!
              </p>
              <p className="text-sm text-text-base/70">
                Sua senha foi atualizada. Você já pode fazer login.
              </p>
              <a
                href="/login"
                className="block text-sm text-brand-primary hover:underline font-medium"
              >
                Ir para o login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="senha"
                type="password"
                label="Nova senha"
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
                label="Confirmar nova senha"
                value={confirmaSenha}
                onChange={(e) => {
                  setConfirmaSenha(e.target.value);
                  setErroConfirmacao(null);
                }}
                placeholder="Repita a nova senha"
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
                disabled={carregando || !senha || !confirmaSenha}
                className="w-full"
              >
                {carregando ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
