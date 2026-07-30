import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockCreateClientFn = vi.fn();

const mockStorageUpload = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageCreateSignedUrl = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockStorageUpload,
  remove: mockStorageRemove,
  createSignedUrl: mockStorageCreateSignedUrl,
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

// Mock crypto.randomUUID para ter ID previsível
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "photo-uuid-123"),
}));

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), options);
}

function makeMultipartRequest(
  url: string,
  fileName: string,
  fileType: string,
  fileSize: number
): NextRequest {
  const formData = new FormData();
  const bytes = new Uint8Array(fileSize);
  const file = new File([bytes], fileName, { type: fileType });
  formData.append("photo", file);
  return new NextRequest(new URL(url, "http://localhost"), {
    method: "POST",
    body: formData,
  });
}

/**
 * Configura o mock do supabase com suporte a chamadas encadeadas.
 * roomOwnedByUser: se o ambiente pertence ao usuário.
 * photoCount: número de fotos já existentes no ambiente.
 */
function buildSupabaseMock({
  userId = "user-1",
  roomOwnedByUser = true,
  photoCount = 0,
  photos = [] as Array<{ id: string; image_url: string; position: number }>,
  insertError = null as null | { message: string },
  photoRecord = null as null | { id: string; image_url: string } | { message: string },
}: {
  userId?: string;
  roomOwnedByUser?: boolean;
  photoCount?: number;
  photos?: Array<{ id: string; image_url: string; position: number }>;
  insertError?: null | { message: string };
  photoRecord?: null | { id: string; image_url: string } | { message: string };
} = {}) {
  mockAuth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "quote_rooms") {
      // Verificação de ownership
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
      const mockSingle = vi.fn();
      const mockSelect = vi.fn();
      const mockInsert = vi.fn();
      const mockEq = vi.fn();

      // Para contagem
      const countChain = {
        count: "exact" as const,
        head: true,
      };

      mockSelect.mockImplementation((fields?: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head) {
          // SELECT para contagem
          return {
            eq: vi.fn().mockResolvedValue({ count: photoCount, error: null }),
          };
        }
        // SELECT para listagem
        return {
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: photos, error: null }),
          }),
        };
      });

      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: insertError
              ? null
              : { id: "photo-uuid-123", image_url: "user-1/room-1/photo-uuid-123.jpg", position: photoCount + 1 },
            error: insertError,
          }),
        }),
      });

      return {
        select: mockSelect,
        insert: mockInsert,
      };
    }

    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });

  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
  });
}

// ----------------------------------------------------------------
// GET /api/rooms/[roomId]/photos
// ----------------------------------------------------------------

describe("GET /api/rooms/[roomId]/photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/rooms/[roomId]/photos/route");
    const req = makeRequest("http://localhost/api/rooms/room-1/photos");
    const res = await GET(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(401);
  });

  it("retorna 403 quando room pertence a outro usuário", async () => {
    buildSupabaseMock({ roomOwnedByUser: false });

    const { GET } = await import("@/app/api/rooms/[roomId]/photos/route");
    const req = makeRequest("http://localhost/api/rooms/room-1/photos");
    const res = await GET(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(403);
  });

  it("retorna lista de fotos com id, image_url e position", async () => {
    const photos = [
      { id: "p1", image_url: "user-1/room-1/p1.jpg", position: 1 },
      { id: "p2", image_url: "user-1/room-1/p2.jpg", position: 2 },
    ];
    buildSupabaseMock({ photos, photoCount: 2 });
    mockStorageCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.url/photo" },
      error: null,
    });

    const { GET } = await import("@/app/api/rooms/[roomId]/photos/route");
    const req = makeRequest("http://localhost/api/rooms/room-1/photos");
    const res = await GET(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("image_url");
    expect(body[0]).toHaveProperty("position");
  });
});

// ----------------------------------------------------------------
// POST /api/rooms/[roomId]/photos
// ----------------------------------------------------------------

describe("POST /api/rooms/[roomId]/photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import("@/app/api/rooms/[roomId]/photos/route");
    const req = makeMultipartRequest(
      "http://localhost/api/rooms/room-1/photos",
      "foto.jpg",
      "image/jpeg",
      100
    );
    const res = await POST(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(401);
  });

  it("retorna 403 quando room pertence a outro usuário", async () => {
    buildSupabaseMock({ roomOwnedByUser: false });

    const { POST } = await import("@/app/api/rooms/[roomId]/photos/route");
    const req = makeMultipartRequest(
      "http://localhost/api/rooms/room-1/photos",
      "foto.jpg",
      "image/jpeg",
      100
    );
    const res = await POST(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(403);
  });

  it("retorna 422 com mensagem de tipo inválido para PDF", async () => {
    buildSupabaseMock({ photoCount: 0 });

    const { POST } = await import("@/app/api/rooms/[roomId]/photos/route");
    const req = makeMultipartRequest(
      "http://localhost/api/rooms/room-1/photos",
      "documento.pdf",
      "application/pdf",
      1000
    );
    const res = await POST(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("Tipo inválido");
  });

  it("retorna 422 com mensagem de tamanho para arquivo de 6MB", async () => {
    buildSupabaseMock({ photoCount: 0 });

    const { POST } = await import("@/app/api/rooms/[roomId]/photos/route");
    const sixMB = 6 * 1024 * 1024;
    const req = makeMultipartRequest(
      "http://localhost/api/rooms/room-1/photos",
      "foto.jpg",
      "image/jpeg",
      sixMB
    );
    const res = await POST(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("5MB");
  });

  it("retorna 422 quando já existem 3 fotos no ambiente", async () => {
    buildSupabaseMock({ photoCount: 3 });

    const { POST } = await import("@/app/api/rooms/[roomId]/photos/route");
    const req = makeMultipartRequest(
      "http://localhost/api/rooms/room-1/photos",
      "foto.jpg",
      "image/jpeg",
      100
    );
    const res = await POST(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("Limite");
  });

  it("retorna 201 com URL assinada para upload válido JPEG", async () => {
    buildSupabaseMock({ photoCount: 0 });
    mockStorageUpload.mockResolvedValue({ data: { path: "user-1/room-1/photo-uuid-123.jpg" }, error: null });
    mockStorageCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.url/photo-uuid-123.jpg" },
      error: null,
    });

    const { POST } = await import("@/app/api/rooms/[roomId]/photos/route");
    const req = makeMultipartRequest(
      "http://localhost/api/rooms/room-1/photos",
      "foto.jpg",
      "image/jpeg",
      1000
    );
    const res = await POST(req, { params: Promise.resolve({ roomId: "room-1" }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("image_url");
    expect(body).toHaveProperty("position");
    expect(body.image_url).toContain("signed.url");
  });
});
