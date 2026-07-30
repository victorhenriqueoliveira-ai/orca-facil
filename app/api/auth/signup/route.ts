import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cleanCpfCnpj, validateCpfCnpj } from "@/lib/utils/cpf-cnpj";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { name, email, password, cpfCnpj, termsAccepted } = body as {
    name?: string;
    email?: string;
    password?: string;
    cpfCnpj?: string;
    termsAccepted?: boolean;
  };

  if (!name || !email || !password || !cpfCnpj) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  if (!termsAccepted) {
    return NextResponse.json({ error: "É necessário aceitar os Termos de Uso." }, { status: 400 });
  }

  const digits = cleanCpfCnpj(cpfCnpj);

  if (!validateCpfCnpj(digits)) {
    return NextResponse.json({ error: "CPF ou CNPJ inválido." }, { status: 400 });
  }

  const service = createServiceClient();

  // Checar unicidade do CPF/CNPJ
  const { data: existing } = await service
    .from("profiles")
    .select("id")
    .eq("cpf_cnpj", digits)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Este CPF/CNPJ já possui uma conta cadastrada." },
      { status: 422 }
    );
  }

  // Criar usuário
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    if (
      error.message.toLowerCase().includes("already registered") ||
      error.message.toLowerCase().includes("already exists") ||
      error.status === 422
    ) {
      return NextResponse.json(
        { error: "Este e-mail já está em uso. Tente fazer login." },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data?.user) {
    return NextResponse.json(
      { error: "Não foi possível criar a conta. Tente novamente." },
      { status: 500 }
    );
  }

  // Salvar nome, CPF/CNPJ e aceite dos termos no perfil (criado pelo trigger)
  const { error: profileError } = await service
    .from("profiles")
    .update({
      business_name: name.trim(),
      cpf_cnpj: digits,
      terms_accepted_at: new Date().toISOString(),
    })
    .eq("id", data.user.id);

  if (profileError) {
    console.error("[signup] Erro ao atualizar perfil:", profileError.message);
  }

  return NextResponse.json({ ok: true });
}
