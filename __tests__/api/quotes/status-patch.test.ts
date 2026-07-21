import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockAuth = { getUser: vi.fn() };
const mockFrom = vi.fn();
const mockCreateClientFn = vi.fn();
const mockGetSubscriptionStatus = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

function makeRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const QUOTE_ID = "quote-uuid";

function buildPatchSupabase({
  quoteData = { id: QUOTE_ID, user_id: "user-1" },
  quoteError = null,
  updateError = null,
}: {
  quoteData?: Record<string, unknown> | null;
  quoteError?: Record<string, unknown> | null;
  updateError?: Record<string, unknown> | null;
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "quotes") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: quoteData, error: quoteError }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: updateError }),
        }),
      };
    }

    if (table === "quote_versions") {
      return {
        update: vi.fn().mockReturnValue({
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
// Tests
// ----------------------------------------------------------------

describe("PATCH /api/quotes/[id] — status update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });
  });

  it("atualiza status para 'accepted' com sucesso", async () => {
    buildPatchSupabase();

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, { status: "accepted" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("retorna 400 para status inválido", async () => {
    buildPatchSupabase();

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, { status: "invalid_status" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("status inválido");
  });

  it("atualiza status para 'rejected' com sucesso", async () => {
    buildPatchSupabase();

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, { status: "rejected" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
  });

  it("atualiza status para 'sent' com sucesso", async () => {
    buildPatchSupabase();

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, { status: "sent" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
  });

  it("retorna 404 se orçamento não pertence ao usuário", async () => {
    buildPatchSupabase({ quoteData: null, quoteError: { message: "not found" } });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, { status: "accepted" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(404);
  });
});
