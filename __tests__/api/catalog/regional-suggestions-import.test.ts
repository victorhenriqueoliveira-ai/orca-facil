import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockCreateClientFn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

// Mantemos extractUF real — só mockamos o supabase
vi.mock("@/app/api/catalog/regional-suggestions/route", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/api/catalog/regional-suggestions/route")>();
  return { ...actual };
});

function buildSupabase({
  user,
  profileCity,
  existingItems,
  insertError,
}: {
  user: unknown;
  profileCity: string | null;
  existingItems: { name: string }[];
  insertError?: { message: string } | null;
}) {
  const insertMock = vi.fn().mockResolvedValue({ error: insertError ?? null });

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { city: profileCity },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "catalog_items") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: existingItems,
            error: null,
          }),
        }),
        insert: insertMock,
      };
    }
    return {};
  });

  mockCreateClientFn.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: mockFrom,
  });

  return { insertMock };
}

function makeRequest(body: unknown) {
  return new NextRequest(
    new URL("http://localhost/api/catalog/regional-suggestions/import"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

// ----------------------------------------------------------------
// POST /api/catalog/regional-suggestions/import
// ----------------------------------------------------------------

describe("POST /api/catalog/regional-suggestions/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { POST } = await import(
      "@/app/api/catalog/regional-suggestions/import/route"
    );
    const req = makeRequest({ all: true });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 400 sem item_ids nem all", async () => {
    buildSupabase({
      user: { id: "user-1" },
      profileCity: "São Paulo - SP",
      existingItems: [],
    });

    const { POST } = await import(
      "@/app/api/catalog/regional-suggestions/import/route"
    );
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("importa todos os itens da UF com all: true", async () => {
    const { insertMock } = buildSupabase({
      user: { id: "user-1" },
      profileCity: "São Paulo - SP",
      existingItems: [],
    });

    const { POST } = await import(
      "@/app/api/catalog/regional-suggestions/import/route"
    );
    const req = makeRequest({ all: true });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBeGreaterThan(0);
    expect(body.skipped).toBe(0);
    expect(insertMock).toHaveBeenCalledOnce();

    const insertedRows = insertMock.mock.calls[0][0];
    expect(insertedRows.every((r: { user_id: string }) => r.user_id === "user-1")).toBe(true);
  });

  it("pula itens já existentes (pelo nome) sem retornar erro", async () => {
    const { insertMock } = buildSupabase({
      user: { id: "user-1" },
      profileCity: "SP",
      // Simula que MDF 15mm e MDF 18mm já existem
      existingItems: [{ name: "MDF 15mm" }, { name: "MDF 18mm" }],
    });

    const { POST } = await import(
      "@/app/api/catalog/regional-suggestions/import/route"
    );
    const req = makeRequest({ all: true });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(2);
    expect(body.imported).toBeGreaterThan(0);

    // Verifica que os itens já existentes não foram inseridos novamente
    if (insertMock.mock.calls.length > 0) {
      const insertedRows = insertMock.mock.calls[0][0] as { name: string }[];
      expect(insertedRows.find((r) => r.name === "MDF 15mm")).toBeUndefined();
      expect(insertedRows.find((r) => r.name === "MDF 18mm")).toBeUndefined();
    }
  });

  it("importa apenas item_ids especificados", async () => {
    const { insertMock } = buildSupabase({
      user: { id: "user-1" },
      profileCity: "RJ",
      existingItems: [],
    });

    const { POST } = await import(
      "@/app/api/catalog/regional-suggestions/import/route"
    );
    const req = makeRequest({ item_ids: ["MDF 15mm", "Puxador"] });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(2);
    expect(body.skipped).toBe(0);

    const insertedRows = insertMock.mock.calls[0][0] as { name: string }[];
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows.map((r) => r.name).sort()).toEqual(["MDF 15mm", "Puxador"].sort());
  });

  it("retorna imported: 0, skipped: 0 para UF sem dados", async () => {
    buildSupabase({
      user: { id: "user-1" },
      profileCity: "ZZ", // UF não mapeada
      existingItems: [],
    });

    const { POST } = await import(
      "@/app/api/catalog/regional-suggestions/import/route"
    );
    const req = makeRequest({ all: true });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(0);
    expect(body.skipped).toBe(0);
  });
});
