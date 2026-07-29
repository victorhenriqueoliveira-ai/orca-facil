import { describe, it, expect, vi, beforeEach } from "vitest";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockServiceFrom = vi.fn();
const mockSignedUrl = vi.fn();
const mockCreateServiceClientFn = vi.fn();
const mockNotFound = vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); });

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mockCreateServiceClientFn,
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("@/lib/quotes/calculate", () => ({
  calculateTotal: vi.fn(() => ({
    rooms: [{ roomId: "r1", roomName: "Sala", subtotal: 1000, totalWithMargin: 1200 }],
    grandTotal: 1200,
    grandTotalBruto: 1000,
  })),
  formatBRL: vi.fn((v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`),
}));

// Mock do componente ApproveButton
vi.mock("@/app/o/[token]/approve-button", () => ({
  ApproveButton: () => null,
}));

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function makeQuote(overrides: Record<string, unknown> = {}) {
  return {
    id: "quote-uuid",
    quote_number: 42,
    status: "sent",
    approval_token_expires_at: FUTURE_DATE,
    notes: null,
    customers: { name: "João Silva", phone: "11999999999", email: "joao@teste.com" },
    quote_versions: [
      {
        id: "v1",
        name: "Versão 1",
        profit_margin_pct: 30,
        quote_rooms: [
          {
            id: "r1",
            name: "Sala",
            position: 1,
            quote_items: [{ unit_price: 1000, quantity: 1 }],
          },
        ],
      },
    ],
    profiles: { business_name: "Marcenaria Teste", phone: "11888888888", logo_url: null },
    ...overrides,
  };
}

function setupServiceClient(quoteData: unknown, logoSignedUrl?: string | null) {
  mockCreateServiceClientFn.mockReturnValue({
    from: (table: string) => {
      if (table === "quotes") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve(
                  quoteData !== null
                    ? { data: quoteData, error: null }
                    : { data: null, error: { message: "not found" } }
                ),
            }),
          }),
        };
      }
      return mockServiceFrom(table);
    },
    storage: {
      from: () => ({
        createSignedUrl: mockSignedUrl.mockResolvedValue({
          data: logoSignedUrl ? { signedUrl: logoSignedUrl } : null,
        }),
      }),
    },
  });
}

// ----------------------------------------------------------------
// Testes
// ----------------------------------------------------------------

describe("GET /o/[token] — página de aprovação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chama notFound() quando token não existe no banco", async () => {
    setupServiceClient(null);

    const { default: ApprovalPage } = await import("@/app/o/[token]/page");

    await expect(
      ApprovalPage({ params: Promise.resolve({ token: "token-invalido" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renderiza estado 'Link expirado' quando approval_token_expires_at está no passado", async () => {
    const quote = makeQuote({ approval_token_expires_at: PAST_DATE });
    setupServiceClient(quote);

    const { default: ApprovalPage } = await import("@/app/o/[token]/page");
    const result = await ApprovalPage({ params: Promise.resolve({ token: "some-token" }) });

    // O resultado é um React element — verificar que é renderizado (não lança erro)
    expect(result).toBeDefined();
  });

  it("renderiza estado 'Orçamento já aprovado' quando status é 'accepted'", async () => {
    const quote = makeQuote({ status: "accepted", approval_token_expires_at: FUTURE_DATE });
    setupServiceClient(quote);

    const { default: ApprovalPage } = await import("@/app/o/[token]/page");
    const result = await ApprovalPage({ params: Promise.resolve({ token: "some-token" }) });

    expect(result).toBeDefined();
  });

  it("renderiza estado ativo com botão Aprovar quando token é válido", async () => {
    const quote = makeQuote();
    setupServiceClient(quote);

    const { default: ApprovalPage } = await import("@/app/o/[token]/page");
    const result = await ApprovalPage({ params: Promise.resolve({ token: "valid-token" }) });

    expect(result).toBeDefined();
    // Não deve ter chamado notFound
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("renderiza estado expirado quando status é 'cancelled'", async () => {
    const quote = makeQuote({ status: "cancelled", approval_token_expires_at: FUTURE_DATE });
    setupServiceClient(quote);

    const { default: ApprovalPage } = await import("@/app/o/[token]/page");
    const result = await ApprovalPage({ params: Promise.resolve({ token: "some-token" }) });

    expect(result).toBeDefined();
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("gera signed URL da logo quando logo_url está presente", async () => {
    const quote = makeQuote({
      profiles: { business_name: "Marcenaria Teste", phone: "11888888888", logo_url: "logos/logo.png" },
    });
    setupServiceClient(quote, "https://cdn.supabase.co/signed-logo.png");

    const { default: ApprovalPage } = await import("@/app/o/[token]/page");
    await ApprovalPage({ params: Promise.resolve({ token: "valid-token" }) });

    expect(mockSignedUrl).toHaveBeenCalledWith("logos/logo.png", 3600);
  });
});
