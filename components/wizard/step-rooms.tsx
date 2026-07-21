"use client";

import { useState, useEffect } from "react";
import { RoomItemForm, type RoomItemFormData } from "@/components/wizard/room-item-form";

export interface Template {
  id: string;
  name: string;
  items: Array<{ id: string; name: string; type: string; unit: string }>;
}

export interface RoomItem {
  id: string;
  name: string;
  type: string;
  unit: string;
  unit_price: number;
  quantity: number;
}

export interface Room {
  id: string;
  name: string;
  items: RoomItem[];
}

export interface StepRoomsProps {
  quoteId: string;
  versionId: string;
  onNext: (rooms: Room[]) => void;
  onBack: () => void;
}

/**
 * Etapa 2 do wizard: listagem de ambientes e adição de itens.
 * Botão "Avançar" desabilitado enquanto não houver ao menos 1 ambiente com 1 item.
 */
export function StepRooms({ quoteId, versionId, onNext, onBack }: StepRoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [addingItemToRoomId, setAddingItemToRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);

  const canAdvance = rooms.some((r) => r.items.length > 0);

  useEffect(() => {
    setTemplatesLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, []);

  async function handleAddRoom(templateId: string | null, templateName?: string) {
    setAddingRoom(true);
    setError(null);
    setShowTemplateSelector(false);

    const roomName = templateName ?? "Ambiente personalizado";

    try {
      const res = await fetch(
        `/api/quotes/${quoteId}/versions/${versionId}/rooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: roomName,
            template_id: templateId,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Erro ao adicionar ambiente");
        return;
      }

      const { room_id, items } = await res.json();
      const newRoom: Room = {
        id: room_id,
        name: roomName,
        items: (items ?? []).map((item: { id: string; name: string; type: string; unit: string; unit_price: number; quantity: number }) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          unit: item.unit,
          unit_price: item.unit_price,
          quantity: item.quantity,
        })),
      };

      setRooms((prev) => [...prev, newRoom]);
    } catch {
      setError("Erro ao adicionar ambiente");
    } finally {
      setAddingRoom(false);
    }
  }

  async function handleAddItem(roomId: string, data: RoomItemFormData) {
    const res = await fetch(
      `/api/quotes/${quoteId}/versions/${versionId}/rooms/${roomId}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Erro ao adicionar item");
    }

    const { item_id } = await res.json();
    const newItem: RoomItem = {
      id: item_id,
      name: data.name,
      type: data.type,
      unit: data.unit,
      unit_price: data.unit_price,
      quantity: data.quantity,
    };

    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, items: [...r.items, newItem] } : r
      )
    );
    setAddingItemToRoomId(null);
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Ambientes</h2>
        <p className="text-sm text-gray-500">
          Adicione os ambientes e seus itens ao orçamento.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
      )}

      {/* Lista de ambientes */}
      <div className="flex flex-col gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">{room.name}</h3>
              <span className="text-xs text-gray-500">
                {room.items.length} {room.items.length === 1 ? "item" : "itens"}
              </span>
            </div>

            {room.items.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {room.items.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.type} · {item.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">
                          {item.quantity} × R$ {item.unit_price.toFixed(2)}
                        </p>
                        <p className="text-xs font-semibold text-gray-800">
                          R$ {(item.quantity * item.unit_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {addingItemToRoomId === room.id ? (
              <div className="border-t border-gray-100">
                <RoomItemForm
                  onSubmit={(data) => handleAddItem(room.id, data)}
                  onCancel={() => setAddingItemToRoomId(null)}
                />
              </div>
            ) : (
              <div className="border-t border-gray-100 px-4 py-2">
                <button
                  type="button"
                  onClick={() => setAddingItemToRoomId(room.id)}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 py-1 transition-colors"
                >
                  + Adicionar item
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Seletor de template */}
      {showTemplateSelector && (
        <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-700">Escolha um template</h3>

          {templatesLoading ? (
            <p className="text-sm text-gray-500 text-center py-2">Carregando...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleAddRoom(t.id, t.name)}
                  disabled={addingRoom}
                  className="text-left border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.items.length} {t.items.length === 1 ? "item" : "itens"} pré-definidos
                  </p>
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleAddRoom(null, "Ambiente personalizado")}
                disabled={addingRoom}
                className="text-left border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 text-sm disabled:opacity-50"
              >
                + Ambiente personalizado (sem template)
              </button>

              <button
                type="button"
                onClick={() => setShowTemplateSelector(false)}
                className="text-sm text-gray-500 py-1 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Botão adicionar ambiente */}
      {!showTemplateSelector && (
        <button
          type="button"
          onClick={() => setShowTemplateSelector(true)}
          disabled={addingRoom}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {addingRoom ? "Adicionando..." : "+ Adicionar ambiente"}
        </button>
      )}

      {/* Navegação */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={() => onNext(rooms)}
          disabled={!canAdvance}
          className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={!canAdvance ? "Adicione ao menos um ambiente com um item" : ""}
        >
          Avançar →
        </button>
      </div>

      {!canAdvance && (
        <p className="text-xs text-gray-500 text-center -mt-3">
          Adicione ao menos um ambiente com um item para avançar.
        </p>
      )}
    </div>
  );
}
