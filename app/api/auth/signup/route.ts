import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  const service = createServiceClient();

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

  return NextResponse.json({ ok: true });
}
