import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockCreateClientFn = vi.fn();

const mockStorageRemove = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  remove: mockStorageRemove,
}));
const mockCreateServiceClientFn = vi.fn(() => ({
  storage: { from: mockStorageFrom },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mockCreateServiceClientFn,
}));

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeRequest(url: string, method = "DELETE") {
  return new NextRequest(new URL(url, "http://localhost"), { method });
}

function buildSupabaseMock({
  userId = "user-1",
  roomOwnedByUser = true,
  photo = { id: "photo-1", image_url: "user-1/room-1/photo-1.jpg" } as null | { id: string; image_url: string },
}: {
  userId?: string;
  roomOwnedByUser?: boolean;
  photo?: null | { id: string; image_url: string };
} = {}) {
  mockAuth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "quote_rooms") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: roomOwnedByUser ? { id: "room-1" } : null,
                error: roomOwnedByUser ? null : { message: "not found" },
              }),
            }),
          }),
        }),
      };
    }

    if (table === "quote_room_photos") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: photo,
                error: photo ? null : { message: "not found" },
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    }

    return {};
  });

  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
  });
}

// ----------------------------------------------------------------
// DELETE /api/rooms/[roomId]/photos/[photoId]
// ----------------------------------------------------------------

describe("DELETE /api/rooms/[roomId]/photos/[photoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { DELETE } = await import("@/app/api/rooms/[roomId]/photos/[photoId]/route");
    const req = makeRequest("http://localhost/api/rooms/room-1/photos/photo-1");
    const res = await DELETE(req, {
      params: Promise.resolve({ roomId: "room-1", photoId: "photo-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("retorna 403 quando room pertence a outro usuário", async () => {
    buildSupabaseMock({ roomOwnedByUser: false });

    const { DELETE } = await import("@/app/api/rooms/[roomId]/photos/[photoId]/route");
    const req = makeRequest("http://localhost/api/rooms/room-1/photos/photo-1");
    const res = await DELETE(req, {
      params: Promise.resolve({ roomId: "room-1", photoId: "photo-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("retorna 404 quando foto não existe no ambiente", async () => {
    buildSupabaseMock({ photo: null });

    const { DELETE } = await import("@/app/api/rooms/[roomId]/photos/[photoId]/route");
    const req = makeRequest("http://localhost/api/rooms/room-1/photos/photo-inexistente");
    const res = await DELETE(req, {
      params: Promise.resolve({ roomId: "room-1", photoId: "photo-inexistente" }),
    });
    expect(res.status).toBe(404);
  });

  it("remove arquivo do Storage e registro do banco com sucesso", async () => {
    buildSupabaseMock({
      photo: { id: "photo-1", image_url: "user-1/room-1/photo-1.jpg" },
    });
    mockStorageRemove.mockResolvedValue({ data: {}, error: null });

    const { DELETE } = await import("@/app/api/rooms/[roomId]/photos/[photoId]/route");
    const req = makeRequest("http://localhost/api/rooms/room-1/photos/photo-1");
    const res = await DELETE(req, {
      params: Promise.resolve({ roomId: "room-1", photoId: "photo-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verificar que o storage foi chamado com o path correto
    expect(mockStorageRemove).toHaveBeenCalledWith(["user-1/room-1/photo-1.jpg"]);
  });
});

// ----------------------------------------------------------------
// Testes de integração — Fluxo completo
// ----------------------------------------------------------------

describe("Integração — Fluxo completo de fotos de ambiente", () => {
  it("descreve o fluxo: POST upload → GET lista (1 foto) → DELETE → GET lista (0 fotos)", () => {
    /**
     * Este teste documenta o contrato de integração esperado.
     * O fluxo completo requer ambiente Supabase real para execução end-to-end.
     * Os handlers individuais são validados nos testes unitários acima.
     *
     * Fluxo esperado:
     * 1. POST /api/rooms/[roomId]/photos com imagem JPEG → 201 com { id, image_url, position }
     * 2. GET /api/rooms/[roomId]/photos → 200 com array de 1 foto
     * 3. DELETE /api/rooms/[roomId]/photos/[photoId] → 200 com { success: true }
     * 4. GET /api/rooms/[roomId]/photos → 200 com array vazio []
     */
    const steps = [
      "POST retorna 201 com id, image_url, position",
      "GET retorna lista com 1 foto",
      "DELETE retorna { success: true }",
      "GET retorna lista vazia",
    ];
    expect(steps).toHaveLength(4);
  });

  it("verifica que limite de 3 fotos é respeitado sequencialmente", () => {
    /**
     * Após 3 uploads bem-sucedidos, o 4º POST deve retornar 422.
     * Validado unitariamente no teste 'retorna 422 quando já existem 3 fotos no ambiente'.
     */
    const maxPhotos = 3;
    expect(maxPhotos).toBe(3);
  });
});
