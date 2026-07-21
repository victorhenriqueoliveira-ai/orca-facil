import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---- Mocks de módulos ----

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();

const mockStorageBucket = {
  upload: mockUpload,
  createSignedUrl: mockCreateSignedUrl,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: vi.fn(() => mockStorageBucket) },
  })),
}));

const mockGetSubscriptionStatus = vi.fn();
vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

// Mock do Supabase JS (service client)
const mockServiceUpload = vi.fn();
const mockServiceCreateSignedUrl = vi.fn();
const mockServiceStorageBucket = {
  upload: mockServiceUpload,
  createSignedUrl: mockServiceCreateSignedUrl,
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => mockServiceStorageBucket),
    },
  })),
}));

// ---- Importação do handler ----

let POST: typeof import("@/app/api/profile/logo/route").POST;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  // Re-registrar mocks após resetModules
  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
      auth: { getUser: mockGetUser },
      from: mockFrom,
      storage: { from: vi.fn(() => mockStorageBucket) },
    })),
  }));
  vi.mock("@/lib/subscription/get-status", () => ({
    getSubscriptionStatus: mockGetSubscriptionStatus,
  }));
  vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => ({
      storage: {
        from: vi.fn(() => mockServiceStorageBucket),
      },
    })),
  }));

  // Definir variáveis de ambiente para o service client
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const mod = await import("@/app/api/profile/logo/route");
  POST = mod.POST;
});

// Helpers
function usuarioAutenticado(id = "user-123") {
  mockGetUser.mockResolvedValue({ data: { user: { id } }, error: null });
}

function subscricaoAtiva() {
  mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "trial" });
}

function subscricaoReadOnly() {
  mockGetSubscriptionStatus.mockResolvedValue({ canWrite: false, status: "read_only" });
}

function criarRequest(file: File | null, campo = "logo"): NextRequest {
  const formData = new FormData();
  if (file) {
    formData.append(campo, file);
  }
  return new NextRequest("http://localhost/api/profile/logo", {
    method: "POST",
    body: formData,
  });
}

function criarArquivo(tipo: string, tamanhoBytes: number, nome = "test.jpg"): File {
  const buffer = new ArrayBuffer(tamanhoBytes);
  return new File([buffer], nome, { type: tipo });
}

// ============================================================
// Testes de POST /api/profile/logo
// ============================================================
describe("POST /api/profile/logo", () => {
  it("retorna 401 quando usuário não está autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const arquivo = criarArquivo("image/jpeg", 1024);
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 403 quando assinatura é read_only", async () => {
    usuarioAutenticado();
    subscricaoReadOnly();

    const arquivo = criarArquivo("image/jpeg", 1024);
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("retorna 400 quando arquivo PDF é enviado (tipo inválido)", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const arquivo = criarArquivo("application/pdf", 1024, "test.pdf");
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const dados = await res.json();
    expect(dados.error).toBeTruthy();
  });

  it("retorna 400 quando tipo text/plain é enviado (tipo inválido)", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const arquivo = criarArquivo("text/plain", 1024, "test.txt");
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 413 quando arquivo de 6MB é enviado (tamanho excedido)", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const seisMB = 6 * 1024 * 1024;
    const arquivo = criarArquivo("image/jpeg", seisMB, "grande.jpg");
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("retorna 200 com logo_url e logoSignedUrl quando JPEG válido é enviado", async () => {
    usuarioAutenticado("user-abc");
    subscricaoAtiva();

    // Mock upload com sucesso
    mockServiceUpload.mockResolvedValue({ data: {}, error: null });
    // Mock upsert do perfil
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(chain);
    // Mock signed URL
    mockServiceCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.url/logo.jpg" },
      error: null,
    });

    const quatroMB = 4 * 1024 * 1024;
    const arquivo = criarArquivo("image/jpeg", quatroMB, "logo.jpg");
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.logo_url).toContain("user-abc/logo.jpg");
    expect(dados.logoSignedUrl).toBe("https://signed.url/logo.jpg");
  });

  it("retorna 200 com logo_url e logoSignedUrl quando PNG válido é enviado", async () => {
    usuarioAutenticado("user-png");
    subscricaoAtiva();

    mockServiceUpload.mockResolvedValue({ data: {}, error: null });
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(chain);
    mockServiceCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.url/logo.png" },
      error: null,
    });

    const arquivo = criarArquivo("image/png", 1024 * 1024, "logo.png");
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.logo_url).toContain("user-png/logo.png");
  });

  it("retorna 200 com logo_url e logoSignedUrl quando WebP válido é enviado", async () => {
    usuarioAutenticado("user-webp");
    subscricaoAtiva();

    mockServiceUpload.mockResolvedValue({ data: {}, error: null });
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(chain);
    mockServiceCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.url/logo.webp" },
      error: null,
    });

    const arquivo = criarArquivo("image/webp", 1024 * 1024, "logo.webp");
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.logo_url).toContain("user-webp/logo.webp");
  });

  it("retorna 400 quando campo 'logo' não está presente no FormData", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const req = criarRequest(null);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 500 quando upload para Storage falha", async () => {
    usuarioAutenticado("user-fail");
    subscricaoAtiva();

    mockServiceUpload.mockResolvedValue({
      data: null,
      error: { message: "Storage error" },
    });

    const arquivo = criarArquivo("image/jpeg", 1024, "logo.jpg");
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("retorna exatamente 5MB como válido (no limite)", async () => {
    usuarioAutenticado("user-5mb");
    subscricaoAtiva();

    const cinchoMB = 5 * 1024 * 1024;
    mockServiceUpload.mockResolvedValue({ data: {}, error: null });
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(chain);
    mockServiceCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.url/logo.jpg" },
      error: null,
    });

    const arquivo = criarArquivo("image/jpeg", cinchoMB, "logo.jpg");
    const req = criarRequest(arquivo);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
