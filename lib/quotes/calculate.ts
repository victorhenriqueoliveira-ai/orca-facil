/**
 * Funções puras de cálculo de totais de orçamento.
 * Sem dependências externas — testável isoladamente.
 * Usadas pelo step-review.tsx e pelo PDF (task_10).
 */

export interface QuoteItem {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  quantity: number;
}

export interface QuoteRoom {
  id: string;
  name: string;
  items: QuoteItem[];
}

export interface RoomTotal {
  roomId: string;
  roomName: string;
  subtotal: number;
  totalWithMargin: number;
}

export interface QuoteTotals {
  rooms: RoomTotal[];
  grandTotal: number;
  grandTotalBruto: number;
}

/**
 * Calcula o total bruto de um ambiente (sem margem).
 */
export function calculateRoomSubtotal(items: QuoteItem[]): number {
  return items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
}

/**
 * Aplica margem de lucro a um valor.
 * total_com_margem = subtotal * (1 + margin_pct / 100)
 */
export function applyMargin(subtotal: number, margin_pct: number): number {
  return subtotal * (1 + margin_pct / 100);
}

/**
 * Calcula totais completos do orçamento: por ambiente e global.
 *
 * @param rooms - lista de ambientes com seus itens
 * @param margin_pct - margem de lucro em porcentagem (ex: 30 = 30%)
 */
export function calculateTotal(rooms: QuoteRoom[], margin_pct: number): QuoteTotals {
  const roomTotals: RoomTotal[] = rooms.map((room) => {
    const subtotal = calculateRoomSubtotal(room.items);
    const totalWithMargin = applyMargin(subtotal, margin_pct);
    return {
      roomId: room.id,
      roomName: room.name,
      subtotal,
      totalWithMargin,
    };
  });

  const grandTotalBruto = roomTotals.reduce((acc, r) => acc + r.subtotal, 0);
  const grandTotal = roomTotals.reduce((acc, r) => acc + r.totalWithMargin, 0);

  return {
    rooms: roomTotals,
    grandTotal,
    grandTotalBruto,
  };
}

/**
 * Formata um valor numérico em BRL (R$ X.XXX,XX).
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
