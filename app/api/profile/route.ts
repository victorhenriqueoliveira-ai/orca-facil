import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

/**
 * GET /api/profile
 * Retorna o perfil do usuário autenticado.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, business_name, city, phone, pix_key, bank_info, logo_url, profit_margin_pct, quote_validity_days, updated_at"
    )
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found — perfil ainda não criado
    return NextResponse.json(
      { error: "Erro ao buscar perfil" },
      { status: 500 }
    );
  }

  // Gerar signed URL da logo se existir
  let logoSignedUrl: string | null = null;
  if (profile?.logo_url) {
    const { data: signedData } = await supabase.storage
      .from("logos")
      .createSignedUrl(profile.logo_url, 3600); // 1 hora
    logoSignedUrl = signedData?.signedUrl ?? null;
  }

  return NextResponse.json({
    profile: profile ?? null,
    logoSignedUrl,
  });
}

/**
 * PATCH /api/profile
 * Atualização parcial dos campos do perfil.
 * Campos permitidos: business_name, city, phone, pix_key, bank_info,
 * quote_validity_days, profit_margin_pct
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Guard de read_only
  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) {
    return NextResponse.json(
      { error: "Assinatura inativa. Acesso somente leitura." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Campos permitidos para PATCH
  const camposPermitidos = [
    "business_name",
    "city",
    "phone",
    "pix_key",
    "bank_info",
    "quote_validity_days",
    "profit_margin_pct",
    "logo_url",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (campo in body) {
      updates[campo] = body[campo];
    }
  }

  // Validações
  if ("profit_margin_pct" in updates) {
    const margem = Number(updates.profit_margin_pct);
    if (isNaN(margem) || margem < 0 || margem > 100) {
      return NextResponse.json(
        { error: "profit_margin_pct deve estar entre 0 e 100" },
        { status: 400 }
      );
    }
  }

  if ("quote_validity_days" in updates) {
    const prazo = Number(updates.quote_validity_days);
    if (isNaN(prazo) || prazo < 1 || !Number.isInteger(prazo)) {
      return NextResponse.json(
        { error: "quote_validity_days deve ser um inteiro >= 1" },
        { status: 400 }
      );
    }
  }

  // Se não houver campos a atualizar, retorna 200 sem alterar
  if (Object.keys(updates).length === 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    return NextResponse.json({ profile: profile ?? null });
  }

  updates.updated_at = new Date().toISOString();

  // Upsert: cria perfil se não existir
  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...updates }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile });
}
