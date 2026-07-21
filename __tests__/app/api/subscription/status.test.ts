import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockGetSubscriptionStatus = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

let GET: typeof import("@/app/api/subscription/route").GET;

beforeEach(async () => {
  vi.clearAllMocks();

  const mod = await import("@/app/api/subscription/route");
  GET = mod.GET;
});

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/subscription");
}

describe("GET /api/subscription", () => {
  it("retorna 401 quando não autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("retorna status da assinatura do usuário autenticado", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123" } },
    });
    mockGetSubscriptionStatus.mockResolvedValue({
      status: "active",
      daysLeft: null,
      canWrite: true,
      trialEndsAt: null,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      status: "active",
      canWrite: true,
    });
  });

  it("retorna status='trial' para usuário em período de trial", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-trial" } },
    });
    mockGetSubscriptionStatus.mockResolvedValue({
      status: "trial",
      daysLeft: 15,
      canWrite: true,
      trialEndsAt: new Date(Date.now() + 15 * 86400_000).toISOString(),
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("trial");
    expect(json.daysLeft).toBe(15);
  });
});
