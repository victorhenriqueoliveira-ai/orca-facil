import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cleanCpfCnpj, validateCpfCnpj } from "@/lib/utils/cpf-cnpj";

export async function POST(request: Request) {
  const { name, email, password, cpfCnpj } = await request.json();

  if (!name || !email || !password || !cpfCnpj) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
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

  // Salvar CPF/CNPJ no perfil (criado pelo trigger)
  await service
    .from("profiles")
    .update({ cpf_cnpj: digits })
    .eq("id", data.user.id);

  return NextResponse.json({ ok: true });
}
