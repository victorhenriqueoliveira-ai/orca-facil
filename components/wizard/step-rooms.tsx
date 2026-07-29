"use client";

import { useState, useEffect } from "react";
import { RoomItemForm, type RoomItemFormData } from "@/components/wizard/room-item-form";

/** Área padrão de uma chapa de MDF 2750mm × 1830mm em m² */
export const AREA_CHAPA_M2 = 2.750 * 1.830; // 5.0325 m²

/**
 * Calcula o número de chapas de MDF necessárias dado a área total e o percentual de perda.
 * @param areaTotalM2 - Área total em metros quadrados
 * @param sheetWastePct - Percentual de perda (0–100)
 * @returns Número inteiro de chapas (arredondado para cima), ou 0 se área <= 0
 */
export function calcChapas(areaTotalM2: number, sheetWastePct: number): number {
  if (areaTotalM2 <= 0) return 0;
  const areaUtil = AREA_CHAPA_M2 * (1 - sheetWastePct / 100);
  return Math.ceil(areaTotalM2 / areaUtil);
}

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

export interface QuoteVersion {
  id: string;
  name: string;
}

export interface StepRoomsProps {
  quoteId: string;
  versionId: string;
  versions?: QuoteVersion[];
  onNext: (rooms: Room[]) => void;
  onBack: () => void;
  onVersionChange?: (versionId: string) => void;
  onVersionCreated?: (version: QuoteVersion) => void;
}

/**
 * Etapa 2 do wizard: listagem de ambientes e adição de itens.
 * Botão "Avançar" desabilitado enquanto não houver ao menos 1 ambiente com 1 item.
 * Exibe abas de versões horizontais quando há múltiplas versões.
 */
export function StepRooms({
  quoteId,
  versionId,
  versions = [],
  onNext,
  onBack,
  onVersionChange,
  onVersionCreated,
}: StepRoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [addingItemToRoomId, setAddingItemToRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [renamingRoomId, setRenamingRoomId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sheetWastePct, setSheetWastePct] = useState<number>(15);

  // State for adding new version
  const [showAddVersionModal, setShowAddVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [addingVersion, setAddingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const canAdvance = rooms.some((r) => r.items.length > 0);

  // Reset rooms when version changes
  useEffect(() => {
    setRooms([]);
  }, [versionId]);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.sheet_waste_pct === "number") {
          setSheetWastePct(data.sheet_waste_pct);
        }
      })
      .catch(() => {
        // mantém o default de 15% em caso de erro
      });
  }, []);

  useEffect(() => {
    setTemplatesLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, []);

  async function handleAddVersion() {
    if (!newVersionName.trim()) {
      setVersionError("Nome da versão é obrigatório");
      return;
    }

    setAddingVersion(true);
    setVersionError(null);

    try {
      const res = await fetch(`/api/quotes/${quoteId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newVersionName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        setVersionError(err.error ?? "Erro ao criar versão");
        return;
      }

      const { version_id } = await res.json();
      const newVersion: QuoteVersion = {
        id: version_id,
        name: newVersionName.trim(),
      };

      setNewVersionName("");
      setShowAddVersionModal(false);
      onVersionCreated?.(newVersion);
    } catch {
      setVersionError("Erro ao criar versão");
    } finally {
      setAddingVersion(false);
    }
  }

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

  async function handleRenameRoom(roomId: string) {
    const name = renameValue.trim();
    if (!name) {
      setRenamingRoomId(null);
      return;
    }
    const room = rooms.find((r) => r.id === roomId);
    if (room && name === room.name) {
      setRenamingRoomId(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/quotes/${quoteId}/versions/${versionId}/rooms/${roomId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      if (res.ok) {
        setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, name } : r));
      }
    } finally {
      setRenamingRoomId(null);
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

  const activeVersionName = versions.find((v) => v.id === versionId)?.name ?? "Padrão";

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Ambientes</h2>
        <p className="text-sm text-gray-500">
          Adicione os ambientes e seus itens ao orçamento.
        </p>
      </div>

      {/* Version tabs */}
      {(versions.length > 1 || onVersionChange) && (
        <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto pb-0">
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                if (v.id !== versionId) {
                  onVersionChange?.(v.id);
                }
              }}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                v.id === versionId
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {v.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowAddVersionModal(true);
              setVersionError(null);
              setNewVersionName("");
            }}
            className="px-3 py-2 text-sm font-medium text-gray-400 hover:text-blue-600 transition-colors border-b-2 border-transparent whitespace-nowrap"
            title="Adicionar versão"
          >
            +
          </button>
        </div>
      )}

      {/* Active version label when only one version and no tabs shown */}
      {versions.length <= 1 && !onVersionChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Versão: <strong>{activeVersionName}</strong></span>
          <button
            type="button"
            onClick={() => {
              setShowAddVersionModal(true);
              setVersionError(null);
              setNewVersionName("");
            }}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            + Nova versão
          </button>
        </div>
      )}

      {/* Add version modal */}
      {showAddVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Nova versão do orçamento</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Nome da versão
                </label>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder='Ex: Premium, Econômica...'
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddVersion();
                    if (e.key === "Escape") setShowAddVersionModal(false);
                  }}
                  autoFocus
                />
              </div>
              {versionError && (
                <p className="text-xs text-red-600">{versionError}</p>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddVersionModal(false)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddVersion}
                  disabled={addingVersion || !newVersionName.trim()}
                  className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {addingVersion ? "Criando..." : "Criar versão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
      )}

      {/* Lista de ambientes */}
      <div className="flex flex-col gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between gap-2">
              {renamingRoomId === room.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameRoom(room.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameRoom(room.id);
                    if (e.key === "Escape") setRenamingRoomId(null);
                  }}
                  className="flex-1 text-sm font-semibold text-gray-800 border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setRenamingRoomId(room.id); setRenameValue(room.name); }}
                  className="text-sm font-semibold text-gray-800 hover:text-blue-600 text-left flex items-center gap-1.5 group"
                  title="Clique para renomear"
                >
                  {room.name}
                  <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
              )}
              <span className="text-xs text-gray-500 shrink-0">
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

            {/* Estimativa de chapas de MDF */}
            {(() => {
              const areaTotal = room.items
                .filter((i) => i.unit === "m²")
                .reduce((acc, i) => acc + i.quantity, 0);
              const numChapas = calcChapas(areaTotal, sheetWastePct);
              if (numChapas <= 0) return null;
              return (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                  <p className="text-xs text-amber-700">
                    Estimativa: ~{numChapas} {numChapas === 1 ? "chapa" : "chapas"} de MDF 2,75×1,83m
                  </p>
                </div>
              );
            })()}

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
