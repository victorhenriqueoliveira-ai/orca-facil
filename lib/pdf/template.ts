/**
 * Template HTML para geração de PDF de orçamentos.
 * CSS 100% inline — sem CDN, sem Tailwind, sem fontes externas.
 * Compatível com Puppeteer em ambiente serverless.
 */

import { formatBRL, calculateTotal } from "@/lib/quotes/calculate";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface PdfItem {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  quantity: number;
}

export interface PdfRoom {
  id: string;
  name: string;
  items: PdfItem[];
}

export interface PdfVersion {
  id: string;
  name: string;
  profit_margin_pct: number;
  rooms: PdfRoom[];
}

export interface PdfQuoteData {
  quoteNumber: number;
  createdAt: string;
  validityDays: number;
  notes: string | null;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  profile: {
    businessName: string;
    city: string | null;
    phone: string | null;
    pixKey: string | null;
    bankInfo: string | null;
    logoUrl: string | null; // signed URL for Puppeteer
  };
  versions: PdfVersion[];
}

export type PdfMode = "summary" | "detailed";

// ----------------------------------------------------------------
// Helper: format date
// ----------------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ----------------------------------------------------------------
// Styles (inline CSS string)
// ----------------------------------------------------------------

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    color: #1a1a1a;
    background: #ffffff;
    padding: 32px;
    line-height: 1.5;
  }
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 2px solid #2563eb;
  }
  .header-logo img {
    max-height: 72px;
    max-width: 180px;
    object-fit: contain;
  }
  .header-logo .no-logo {
    width: 72px;
    height: 72px;
    background: #dbeafe;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #2563eb;
    text-align: center;
    padding: 8px;
  }
  .header-info {
    text-align: right;
  }
  .header-info .business-name {
    font-size: 18px;
    font-weight: bold;
    color: #1e40af;
    margin-bottom: 4px;
  }
  .header-info .meta {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 2px;
  }
  .quote-badge {
    display: inline-block;
    background: #2563eb;
    color: #ffffff;
    font-size: 12px;
    font-weight: bold;
    padding: 4px 12px;
    border-radius: 4px;
    margin-top: 8px;
  }
  .section {
    margin-bottom: 24px;
  }
  .section-title {
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b7280;
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
  }
  .client-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 24px;
  }
  .client-field label {
    font-size: 11px;
    color: #9ca3af;
    display: block;
    margin-bottom: 1px;
  }
  .client-field span {
    font-size: 13px;
    color: #1a1a1a;
  }
  .room-card {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    margin-bottom: 14px;
    overflow: hidden;
  }
  .room-header {
    background: #f3f4f6;
    padding: 8px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .room-header .room-name {
    font-weight: bold;
    font-size: 13px;
    color: #1f2937;
  }
  .room-header .room-total {
    font-weight: bold;
    font-size: 13px;
    color: #2563eb;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
  }
  .items-table th {
    background: #f9fafb;
    font-size: 11px;
    font-weight: bold;
    color: #6b7280;
    text-align: left;
    padding: 6px 14px;
    border-bottom: 1px solid #e5e7eb;
  }
  .items-table th.right {
    text-align: right;
  }
  .items-table td {
    padding: 7px 14px;
    font-size: 12px;
    color: #374151;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }
  .items-table td.right {
    text-align: right;
  }
  .items-table tr:last-child td {
    border-bottom: none;
  }
  .totals-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 16px 20px;
    margin-top: 8px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    font-size: 13px;
    color: #374151;
  }
  .totals-row.grand {
    border-top: 1px solid #bfdbfe;
    margin-top: 8px;
    padding-top: 10px;
    font-size: 16px;
    font-weight: bold;
    color: #1e40af;
  }
  .version-separator {
    border: none;
    border-top: 2px dashed #e5e7eb;
    margin: 28px 0;
  }
  .version-title {
    font-size: 14px;
    font-weight: bold;
    color: #1e40af;
    margin-bottom: 16px;
    padding: 6px 12px;
    background: #eff6ff;
    border-radius: 4px;
    display: inline-block;
  }
  .footer {
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 32px;
  }
  .footer-section {
    flex: 1;
  }
  .footer-label {
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9ca3af;
    margin-bottom: 4px;
  }
  .footer-value {
    font-size: 13px;
    color: #374151;
  }
  .notes-box {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px 14px;
    font-size: 12px;
    color: #6b7280;
    white-space: pre-wrap;
  }
  .validity-badge {
    display: inline-block;
    background: #fef3c7;
    color: #92400e;
    font-size: 12px;
    font-weight: bold;
    padding: 4px 10px;
    border-radius: 4px;
  }
`;

// ----------------------------------------------------------------
// Template: header block
// ----------------------------------------------------------------

function renderHeader(data: PdfQuoteData): string {
  const logoHtml = data.profile.logoUrl
    ? `<img src="${data.profile.logoUrl}" alt="Logo ${data.profile.businessName}" />`
    : `<div class="no-logo">${data.profile.businessName.slice(0, 2).toUpperCase()}</div>`;

  const cityLine = data.profile.city ? `<div class="meta">${data.profile.city}</div>` : "";
  const phoneLine = data.profile.phone ? `<div class="meta">${data.profile.phone}</div>` : "";

  return `
    <div class="header">
      <div class="header-logo">${logoHtml}</div>
      <div class="header-info">
        <div class="business-name">${escapeHtml(data.profile.businessName)}</div>
        ${cityLine}
        ${phoneLine}
        <div class="quote-badge">Orçamento #${data.quoteNumber}</div>
        <div class="meta" style="margin-top:6px;">Emitido em ${formatDate(data.createdAt)}</div>
        <div class="validity-badge" style="margin-top:6px;">Válido por ${data.validityDays} dias</div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------
// Template: client section
// ----------------------------------------------------------------

function renderClient(customer: PdfQuoteData["customer"]): string {
  if (!customer) {
    return `
      <div class="section">
        <div class="section-title">Dados do Cliente</div>
        <p style="color:#9ca3af;font-size:12px;">Cliente não informado</p>
      </div>
    `;
  }

  const fields: { label: string; value: string | null }[] = [
    { label: "Nome", value: customer.name },
    { label: "Telefone", value: customer.phone },
    { label: "E-mail", value: customer.email },
    { label: "Endereço", value: customer.address },
  ];

  const fieldsHtml = fields
    .filter((f) => f.value)
    .map(
      (f) => `
      <div class="client-field">
        <label>${f.label}</label>
        <span>${escapeHtml(f.value!)}</span>
      </div>
    `
    )
    .join("");

  return `
    <div class="section">
      <div class="section-title">Dados do Cliente</div>
      <div class="client-grid">${fieldsHtml}</div>
    </div>
  `;
}

// ----------------------------------------------------------------
// Template: room block (summary mode — no items table)
// ----------------------------------------------------------------

function renderRoomSummary(room: PdfRoom, marginPct: number): string {
  const subtotal = room.items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const total = subtotal * (1 + marginPct / 100);

  return `
    <div class="room-card">
      <div class="room-header">
        <span class="room-name">${escapeHtml(room.name)}</span>
        <span class="room-total">${formatBRL(total)}</span>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------
// Template: room block (detailed mode — with items table)
// ----------------------------------------------------------------

function renderRoomDetailed(room: PdfRoom, marginPct: number): string {
  const subtotal = room.items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const total = subtotal * (1 + marginPct / 100);

  const itemsHtml =
    room.items.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:12px;">Nenhum item</td></tr>`
      : room.items
          .map(
            (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td class="right">${item.quantity}</td>
            <td>${escapeHtml(item.unit)}</td>
            <td class="right">${formatBRL(item.unit_price)}</td>
            <td class="right">${formatBRL(item.unit_price * item.quantity)}</td>
          </tr>
        `
          )
          .join("");

  return `
    <div class="room-card">
      <div class="room-header">
        <span class="room-name">${escapeHtml(room.name)}</span>
        <span class="room-total">${formatBRL(total)}</span>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="right">Qtd</th>
            <th>Unid.</th>
            <th class="right">Preço Unit.</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>
  `;
}

// ----------------------------------------------------------------
// Template: totals box
// ----------------------------------------------------------------

function renderTotals(versions: PdfVersion[]): string {
  // Sum totals across all versions for overall grand total display
  const allRooms = versions.flatMap((v) => v.rooms.map((r) => ({ ...r, marginPct: v.profit_margin_pct })));

  // Per-version totals
  const versionTotalsHtml = versions
    .map((v) => {
      const totals = calculateTotal(v.rooms, v.profit_margin_pct);
      return `
        <div class="totals-row">
          <span>${escapeHtml(v.name)}</span>
          <span>${formatBRL(totals.grandTotal)}</span>
        </div>
      `;
    })
    .join("");

  // Grand total (if multiple versions, show each; if single, show breakdown)
  if (versions.length === 1) {
    const v = versions[0];
    const totals = calculateTotal(v.rooms, v.profit_margin_pct);

    const marginRow =
      v.profit_margin_pct > 0
        ? `
        <div class="totals-row">
          <span>Margem de lucro (${v.profit_margin_pct}%)</span>
          <span>+ ${formatBRL(totals.grandTotal - totals.grandTotalBruto)}</span>
        </div>
      `
        : "";

    return `
      <div class="totals-box">
        <div class="totals-row">
          <span>Total bruto</span>
          <span>${formatBRL(totals.grandTotalBruto)}</span>
        </div>
        ${marginRow}
        <div class="totals-row grand">
          <span>Total final</span>
          <span>${formatBRL(totals.grandTotal)}</span>
        </div>
      </div>
    `;
  }

  // Multiple versions: show each
  const grandSum = versions.reduce((acc, v) => {
    const totals = calculateTotal(v.rooms, v.profit_margin_pct);
    return acc + totals.grandTotal;
  }, 0);

  // suppress unused warning
  void allRooms;

  return `
    <div class="totals-box">
      ${versionTotalsHtml}
      <div class="totals-row grand">
        <span>Total combinado</span>
        <span>${formatBRL(grandSum)}</span>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------
// Template: footer
// ----------------------------------------------------------------

function renderFooter(data: PdfQuoteData): string {
  const pixHtml = data.profile.pixKey
    ? `
    <div class="footer-section">
      <div class="footer-label">Pagamento</div>
      <div class="footer-value">Pix: <strong>${escapeHtml(data.profile.pixKey)}</strong></div>
      ${data.profile.bankInfo ? `<div class="footer-value" style="margin-top:4px;">${escapeHtml(data.profile.bankInfo)}</div>` : ""}
    </div>
  `
    : "";

  const notesHtml = data.notes
    ? `
    <div class="section" style="margin-top:20px;">
      <div class="section-title">Observações</div>
      <div class="notes-box">${escapeHtml(data.notes)}</div>
    </div>
  `
    : "";

  return `
    ${notesHtml}
    <div class="footer">
      <div class="footer-section">
        <div class="footer-label">Validade</div>
        <div class="footer-value">Este orçamento é válido por <strong>${data.validityDays} dias</strong> a partir da data de emissão.</div>
      </div>
      ${pixHtml}
    </div>
  `;
}

// ----------------------------------------------------------------
// Escape HTML
// ----------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ----------------------------------------------------------------
// Main: generatePdfHtml
// ----------------------------------------------------------------

export function generatePdfHtml(data: PdfQuoteData, mode: PdfMode): string {
  const headerHtml = renderHeader(data);
  const clientHtml = renderClient(data.customer);
  const totalsHtml = renderTotals(data.versions);
  const footerHtml = renderFooter(data);

  // Build per-version room sections
  const versionsHtml = data.versions
    .map((version, idx) => {
      const versionTitleHtml =
        data.versions.length > 1
          ? `<div class="version-title">Versão: ${escapeHtml(version.name)}</div>`
          : "";

      const separatorHtml = idx > 0 ? `<hr class="version-separator" />` : "";

      const roomsHtml = version.rooms
        .map((room) =>
          mode === "summary"
            ? renderRoomSummary(room, version.profit_margin_pct)
            : renderRoomDetailed(room, version.profit_margin_pct)
        )
        .join("");

      const emptyRoomsHtml =
        version.rooms.length === 0
          ? `<p style="color:#9ca3af;font-size:12px;text-align:center;padding:16px;">Nenhum ambiente adicionado.</p>`
          : "";

      return `${separatorHtml}${versionTitleHtml}${roomsHtml}${emptyRoomsHtml}`;
    })
    .join("");

  const roomsSectionTitle =
    mode === "summary"
      ? "Ambientes (Resumo)"
      : "Ambientes e Itens";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Orçamento #${data.quoteNumber}</title>
  <style>${STYLES}</style>
</head>
<body>
  ${headerHtml}
  ${clientHtml}
  <div class="section">
    <div class="section-title">${roomsSectionTitle}</div>
    ${versionsHtml}
  </div>
  <div class="section">
    <div class="section-title">Total do Orçamento</div>
    ${totalsHtml}
  </div>
  ${footerHtml}
</body>
</html>`;
}
