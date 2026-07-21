import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  let query = supabase
    .from("customers")
    .select("id, name, phone, email, address, notes, created_at")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (q.trim()) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const subscription = await getSubscriptionStatus(user.id);
  if (subscription.status === "read_only" || subscription.status === "cancelled") {
    return NextResponse.json({ error: "Assinatura necessária" }, { status: 403 });
  }

  const body = await request.json();
  const { name, phone, email, address, notes } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json(
      { error: "Campo 'name' é obrigatório" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      name: name.trim(),
      phone: phone ?? null,
      email: email ?? null,
      address: address ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
