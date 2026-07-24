"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "trial", label: "Trial (30 dias)" },
  { value: "active", label: "Ativo" },
  { value: "read_only", label: "Read-only" },
  { value: "cancelled", label: "Cancelado" },
];

export function AlterarAssinatura({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus ?? "");
  const [extendDays, setExtendDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const body: Record<string, unknown> = {};
    if (status && status !== currentStatus) body.status = status;
    if (extendDays && Number(extendDays) > 0) body.extendDays = Number(extendDays);

    if (!body.status && !body.extendDays) {
      setMsg({ type: "err", text: "Nenhuma alteração a aplicar." });
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/admin/usuarios/${userId}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMsg({ type: "ok", text: "Assinatura atualizada." });
      setExtendDays("");
      router.refresh();
    } else {
      const data = await res.json();
      setMsg({ type: "err", text: data.error ?? "Erro ao atualizar." });
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-base/50">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        >
          <option value="">Manter atual</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-base/50">Estender por (dias)</label>
        <input
          type="number"
          min="1"
          max="365"
          value={extendDays}
          onChange={(e) => setExtendDays(e.target.value)}
          placeholder="ex: 30"
          className="w-28 border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Aplicar"}
      </button>

      {msg && (
        <p
          className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}
        >
          {msg.text}
        </p>
      )}
    </form>
  );
}
