import { describe, it, expect } from "vitest";
import {
  calculateTotal,
  calculateRoomSubtotal,
  applyMargin,
  formatBRL,
  type QuoteRoom,
  type QuoteItem,
} from "@/lib/quotes/calculate";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeItem(
  id: string,
  unit_price: number,
  quantity: number
): QuoteItem {
  return { id, name: `Item ${id}`, unit: "un", unit_price, quantity };
}

function makeRoom(id: string, items: QuoteItem[]): QuoteRoom {
  return { id, name: `Ambiente ${id}`, items };
}

// ----------------------------------------------------------------
// calculateRoomSubtotal
// ----------------------------------------------------------------

describe("calculateRoomSubtotal", () => {
  it("retorna 0 para lista vazia", () => {
    expect(calculateRoomSubtotal([])).toBe(0);
  });

  it("calcula soma de itens simples", () => {
    const items = [makeItem("1", 100, 2), makeItem("2", 50, 3)];
    // 100*2 + 50*3 = 200 + 150 = 350
    expect(calculateRoomSubtotal(items)).toBe(350);
  });

  it("calcula corretamente com quantity decimal", () => {
    const items = [makeItem("1", 85, 0.5)];
    // 85 * 0.5 = 42.5
    expect(calculateRoomSubtotal(items)).toBeCloseTo(42.5);
  });
});

// ----------------------------------------------------------------
// applyMargin
// ----------------------------------------------------------------

describe("applyMargin", () => {
  it("com margem 0 retorna o mesmo valor", () => {
    expect(applyMargin(1000, 0)).toBe(1000);
  });

  it("com margem 30 e total 1000 retorna 1300", () => {
    expect(applyMargin(1000, 30)).toBe(1300);
  });

  it("com margem 100 duplica o valor", () => {
    expect(applyMargin(500, 100)).toBe(1000);
  });
});

// ----------------------------------------------------------------
// calculateTotal
// ----------------------------------------------------------------

describe("calculateTotal", () => {
  it("retorna zeros para lista vazia de rooms", () => {
    const result = calculateTotal([], 30);
    expect(result.grandTotal).toBe(0);
    expect(result.grandTotalBruto).toBe(0);
    expect(result.rooms).toHaveLength(0);
  });

  it("2 itens (2×R$100 e 3×R$50) retorna subtotal R$350", () => {
    const rooms = [
      makeRoom("r1", [makeItem("1", 100, 2), makeItem("2", 50, 3)]),
    ];
    const result = calculateTotal(rooms, 0);
    expect(result.rooms[0].subtotal).toBe(350);
    expect(result.grandTotalBruto).toBe(350);
  });

  it("com margin_pct=30 e total bruto R$1000 retorna grandTotal R$1300", () => {
    const rooms = [makeRoom("r1", [makeItem("1", 1000, 1)])];
    const result = calculateTotal(rooms, 30);
    expect(result.grandTotal).toBe(1300);
  });

  it("com margin_pct=0 grandTotal igual a grandTotalBruto", () => {
    const rooms = [makeRoom("r1", [makeItem("1", 200, 3)])];
    const result = calculateTotal(rooms, 0);
    expect(result.grandTotal).toBe(result.grandTotalBruto);
    expect(result.grandTotal).toBe(600);
  });

  it("quantity=0.5 (decimal) calcula corretamente", () => {
    const rooms = [makeRoom("r1", [makeItem("1", 100, 0.5)])];
    const result = calculateTotal(rooms, 0);
    expect(result.rooms[0].subtotal).toBeCloseTo(50);
    expect(result.grandTotalBruto).toBeCloseTo(50);
  });

  it("múltiplos ambientes somam corretamente", () => {
    const rooms = [
      makeRoom("r1", [makeItem("1", 100, 2)]), // 200
      makeRoom("r2", [makeItem("2", 50, 4)]),  // 200
    ];
    const result = calculateTotal(rooms, 10);
    // bruto = 400, com 10% = 440
    expect(result.grandTotalBruto).toBe(400);
    expect(result.grandTotal).toBeCloseTo(440);
    expect(result.rooms).toHaveLength(2);
    expect(result.rooms[0].totalWithMargin).toBeCloseTo(220);
    expect(result.rooms[1].totalWithMargin).toBeCloseTo(220);
  });
});

// ----------------------------------------------------------------
// formatBRL
// ----------------------------------------------------------------

describe("formatBRL", () => {
  it("formata zero corretamente", () => {
    const formatted = formatBRL(0);
    expect(formatted).toContain("0");
    expect(formatted).toContain("R$");
  });

  it("formata valor com centavos", () => {
    const formatted = formatBRL(1234.56);
    // pt-BR: R$ 1.234,56
    expect(formatted).toMatch(/1\.234,56/);
  });

  it("retorna string", () => {
    expect(typeof formatBRL(100)).toBe("string");
  });
});
