"use client";

import { useState, useEffect, useRef } from "react";

export interface Photo {
  id: string;
  image_url: string;
  position: number;
}

export interface RoomPhotoUploadProps {
  roomId: string;
  onPhotosChange?: (photos: Photo[]) => void;
}

const MAX_PHOTOS = 3;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Componente de upload de fotos de referência por ambiente.
 * Suporta até 3 fotos, upload via câmera ou galeria em dispositivos móveis,
 * preview imediato, exclusão com confirmação inline e loading states.
 */
export function RoomPhotoUpload({ roomId, onPhotosChange }: RoomPhotoUploadProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar fotos existentes ao montar
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/rooms/${roomId}/photos`)
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar fotos");
        return r.json();
      })
      .then((data: Photo[]) => {
        if (!cancelled) {
          setPhotos(data);
          onPhotosChange?.(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao carregar fotos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Limpar o input para permitir re-seleção do mesmo arquivo
    if (inputRef.current) inputRef.current.value = "";

    if (!file) return;

    setError(null);

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipo inválido. Use JPEG, PNG ou WebP.");
      return;
    }

    // Validar tamanho
    if (file.size > MAX_SIZE) {
      setError("Arquivo muito grande. Máximo: 5MB.");
      return;
    }

    // Verificar limite
    if (photos.length >= MAX_PHOTOS) {
      setError(`Limite de ${MAX_PHOTOS} fotos por ambiente atingido.`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`/api/rooms/${roomId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Erro ao enviar foto");
        return;
      }

      const photo: Photo = await res.json();
      const updated = [...photos, photo];
      setPhotos(updated);
      onPhotosChange?.(updated);
    } catch {
      setError("Erro ao enviar foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photoId: string) {
    setDeletingId(photoId);
    setConfirmDeleteId(null);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${roomId}/photos/${photoId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Erro ao excluir foto");
        return;
      }

      const updated = photos.filter((p) => p.id !== photoId);
      setPhotos(updated);
      onPhotosChange?.(updated);
    } catch {
      setError("Erro ao excluir foto. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  const atLimit = photos.length >= MAX_PHOTOS;

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-600 mb-2">
        Fotos de referência ({photos.length}/{MAX_PHOTOS})
      </p>

      {error && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Carregando fotos...</p>
      ) : (
        <>
          {/* Grade de fotos */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative w-20 h-20 rounded overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.image_url}
                    alt={`Foto ${photo.position}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Botão de exclusão / confirmação */}
                  {confirmDeleteId === photo.id ? (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 p-1">
                      <p className="text-white text-[10px] text-center leading-tight">Excluir?</p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(photo.id)}
                          disabled={deletingId === photo.id}
                          className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="bg-white text-gray-700 text-[10px] px-1.5 py-0.5 rounded hover:bg-gray-100"
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  ) : deletingId === photo.id ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-[10px]">...</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(photo.id)}
                      className="absolute top-0.5 right-0.5 bg-black/50 rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70 transition-colors"
                      title="Excluir foto"
                      aria-label="Excluir foto"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Botão de adicionar foto */}
          {!atLimit && (
            <label className={`inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {uploading ? "Enviando..." : "Adicionar foto"}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={uploading}
                aria-label="Adicionar foto"
              />
            </label>
          )}

          {atLimit && (
            <p className="text-xs text-gray-400">Limite de {MAX_PHOTOS} fotos atingido.</p>
          )}
        </>
      )}
    </div>
  );
}
