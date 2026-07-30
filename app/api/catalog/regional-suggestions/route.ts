import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REGIONAL_DEFAULTS } from "@/lib/catalog/regional-defaults";

/**
 * Extrai a UF de um campo `city` em formato livre.
 * Exemplos aceitos: "São Paulo - SP", "SP", "sp", "Fortaleza/CE".
 */
export function extractUF(city: string | null | undefined): string | null {
  if (!city) return null;
  const normalized = city.trim().toUpperCase();
  // Se o campo inteiro for uma UF de 2 letras
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  // Tenta extrair dois caracteres maiúsculos no final após separador não-letra
  // Ex: "São Paulo - SP", "Fortaleza/CE", "Recife (PE)"
  const match = normalized.match(/(?:^|[^A-Z])([A-Z]{2})$/);
  if (match) return match[1];
  return null;
}

/**
 * GET /api/catalog/regional-suggestions
 * Retorna sugestões regionais de catálogo baseadas na UF do perfil do usuário.
 * Retorna 200 com array vazio quando a UF não é encontrada em REGIONAL_DEFAULTS.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("city")
    .eq("id", user.id)
    .single();

  const uf = extractUF(profile?.city);
  const suggestions = uf ? (REGIONAL_DEFAULTS[uf] ?? []) : [];

  return NextResponse.json({ suggestions, uf });
}
