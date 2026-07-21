import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock do AbacatePay client
const mockCancelSubscription = vi.fn();
vi.mock("@/lib/abacatepay/client", () => ({
  cancelSubscription: mockCancelSubscription,
}));

// Mock do Supabase server (usuário autenticado)
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Mock do service client
const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

let POST: typeof import("@/app/api/subscription/cancel/route").POST;

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/subscription/cancel", {
    method: "POST",
  });
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  vi.mock("@/lib/abacatepay/client", () => ({
    cancelSubscription: mockCancelSubscription,
  }));

  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })),
  }));

  vi.mock("@/lib/supabase/service", () => ({
    createServiceClient: vi.fn(() => ({
      from: mockServiceFrom,
    })),
  }));

  const mod = await import("@/app/api/subscription/cancel/route");
  POST = mod.POST;
});

describe("POST /api/subscription/cancel", () => {
  it("retorna 401 quando usuário não está autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
  });

  it("retorna 404 quando assinatura não existe no banco", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ select: mockSelect });

    const res = await POST(makeRequest());

    expect(res.status).toBe(404);
  });

  it("retorna 400 quando assinatura não está ativa", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { abacatepay_subscription_id: "sub_123", status: "trial" },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ select: mockSelect });

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ error: "Only active subscriptions can be cancelled" });
  });

  it("cancela assinatura ativa com sucesso", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { abacatepay_subscription_id: "sub_active_123", status: "active" },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockCancelSubscription.mockResolvedValue({
      id: "sub_active_123",
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    });

    const mockServiceEq = vi.fn().mockResolvedValue({ error: null });
    const mockServiceUpdate = vi.fn().mockReturnValue({ eq: mockServiceEq });
    mockServiceFrom.mockReturnValue({ update: mockServiceUpdate });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, status: "cancelled" });
  });

  it("atualiza banco para status='cancelled' após cancelamento no AbacatePay", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { abacatepay_subscription_id: "sub_active_456", status: "active" },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockCancelSubscription.mockResolvedValue({
      id: "sub_active_456",
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    });

    const mockServiceEq = vi.fn().mockResolvedValue({ error: null });
    const mockServiceUpdate = vi.fn().mockReturnValue({ eq: mockServiceEq });
    mockServiceFrom.mockReturnValue({ update: mockServiceUpdate });

    await POST(makeRequest());

    expect(mockServiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" })
    );
  });

  it("retorna 502 quando AbacatePay falha ao cancelar", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { abacatepay_subscription_id: "sub_active_789", status: "active" },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockCancelSubscription.mockRejectedValue(new Error("AbacatePay API error 503"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
  });
});
