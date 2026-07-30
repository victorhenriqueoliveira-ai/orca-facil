"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCpfCnpj, cleanCpfCnpj, validateCpfCnpj, cpfCnpjLabel } from "@/lib/utils/cpf-cnpj";
import { createClient } from "@/lib/supabase/client";

export default function PaginaCadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [erroCpfCnpj, setErroCpfCnpj] = useState<string | null>(null);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  function validarSenha(value: string): string | null {
    if (value.length > 0 && value.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres.";
    }
    return null;
  }

  function handleCpfCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCpfCnpj(e.target.value);
    setCpfCnpj(formatted);
    setErroCpfCnpj(null);
  }

  function validarCpfCnpj(): string | null {
    const digits = cleanCpfCnpj(cpfCnpj);
    if (!digits) return null;
    if (!validateCpfCnpj(digits)) {
      return `${cpfCnpjLabel(cpfCnpj)} inválido.`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const erroValidacaoSenha = validarSenha(senha);
    if (erroValidacaoSenha) {
      setErroSenha(erroValidacaoSenha);
      return;
    }

    if (senha !== confirmaSenha) {
      setErroConfirmacao("As senhas não coincidem.");
      return;
    }

    const erroCpf = validarCpfCnpj();
    if (erroCpf) {
      setErroCpfCnpj(erroCpf);
      return;
    }

    setCarregando(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome.trim(),
          email: email.trim(),
          password: senha,
          cpfCnpj: cpfCnpj,
          termsAccepted: true,
        }),
      });

      let body: Record<string, unknown> = {};
      try {
        body = await res.json();
      } catch {
        setErro("Erro inesperado do servidor. Tente novamente.");
        return;
      }

      if (!res.ok) {
        setErro((body.error as string) ?? "Ocorreu um erro inesperado. Tente novamente.");
        return;
      }

      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (loginError) {
        setErro("Conta criada com sucesso! Faça login para entrar.");
        window.location.href = "/login";
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }

  const cpfCnpjDigits = cleanCpfCnpj(cpfCnpj);
  const cpfCnpjValido = cpfCnpjDigits.length > 0 && validateCpfCnpj(cpfCnpjDigits);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <div className="text-center">
            <div className="flex items-center justify-center sm:gap-3">
              <img
                src="/orca_facil.png"
                alt="Orça Fácil"
                className="h-[100px] w-auto sm:h-[100px]"
              />
            </div>
            <p className="mt-2 text-text-base/70">Crie sua conta — 30 dias grátis</p>
          </div>
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

            <div className="relative">
              <Input
                id="cpf-cnpj"
                type="text"
                label="CPF ou CNPJ"
                value={cpfCnpj}
                onChange={handleCpfCnpjChange}
                onBlur={() => {
                  const err = validarCpfCnpj();
                  if (err) setErroCpfCnpj(err);
                }}
                placeholder="000.000.000-00"
                required
                disabled={carregando}
                inputMode="numeric"
                error={erroCpfCnpj ?? undefined}
              />
              {cpfCnpjValido && (
                <span className="absolute right-3 top-9 text-green-500 text-xs font-medium">
                  ✓ {cpfCnpjLabel(cpfCnpj)} válido
                </span>
              )}
            </div>

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
              <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{erro}</p>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-brand-primary flex-shrink-0"
              />
              <span className="text-sm text-text-base/70 leading-snug">
                Li e aceito os{" "}
                <a href="/termos" target="_blank" className="text-brand-primary underline hover:text-brand-primary/80">
                  Termos de Uso
                </a>{" "}
                e a{" "}
                <a href="/privacidade" target="_blank" className="text-brand-primary underline hover:text-brand-primary/80">
                  Política de Privacidade
                </a>
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={
                carregando ||
                !nome.trim() ||
                !email.trim() ||
                !cpfCnpj ||
                !senha ||
                !confirmaSenha ||
                !aceitouTermos
              }
              className="w-full"
            >
              {carregando ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-base/70">
            Já tem conta?{" "}
            <a href="/login" className="text-brand-primary hover:underline font-medium">
              Entrar
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
