import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

interface RouteParams {
  params: Promise<{ id: string; vid: string; rid: string }>;
}

/**
 * PATCH /api/quotes/[id]/versions/[vid]/rooms/[rid]
 * Renomeia um ambiente.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });

  const { id: quoteId, rid: roomId } = await params;

  const { data: quote } = await supabase
    .from("quotes").select("id").eq("id", quoteId).eq("user_id", user.id).single();
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const { data, error } = await supabase
    .from("quote_rooms").update({ name: name.trim() }).eq("id", roomId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * DELETE /api/quotes/[id]/versions/[vid]/rooms/[rid]
 * Remove um ambiente e todos os seus itens (cascade).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canWrite) return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });

  const { id: quoteId, rid: roomId } = await params;

  const { data: quote } = await supabase
    .from("quotes").select("id").eq("id", quoteId).eq("user_id", user.id).single();
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

  const { error } = await supabase.from("quote_rooms").delete().eq("id", roomId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
