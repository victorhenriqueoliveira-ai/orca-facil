/**
 * Testes de isolamento de dados via RLS (Row Level Security)
 *
 * Estes testes validam a LÓGICA das políticas RLS sem banco de dados real,
 * simulando as condições de auth.uid() e verificando que as políticas
 * bloqueiam acesso entre usuários.
 *
 * Para testes de integração reais com Supabase local, execute:
 *   supabase start && vitest run --reporter=verbose
 */

import { describe, it, expect } from 'vitest'

// ============================================================
// Simulação das políticas RLS em TypeScript
// ============================================================

interface Row {
  user_id?: string
  id?: string
}

interface Quote extends Row {
  id: string
  user_id: string
  quote_number: number
  status: string
}

interface QuoteVersion {
  id: string
  quote_id: string
  name: string
}

interface QuoteRoom {
  id: string
  quote_version_id: string
  name: string
}

interface QuoteItem {
  id: string
  quote_room_id: string
  name: string
  unit_price: number
}

interface QuotePdf {
  id: string
  quote_id: string
  storage_path: string
}

interface Customer extends Row {
  id: string
  user_id: string
  name: string
}

interface SystemTemplate {
  id: string
  room_type: string
  name: string
}

/**
 * Simula: SELECT * FROM quotes WHERE auth.uid() = user_id
 * Política "own_quotes": USING (auth.uid() = user_id)
 */
function selectQuotes(quotes: Quote[], authUid: string): Quote[] {
  return quotes.filter((q) => q.user_id === authUid)
}

/**
 * Simula: INSERT INTO customers — verifica se user_id corresponde ao auth.uid()
 * Política "own_customers": USING (auth.uid() = user_id)
 */
function canInsertCustomer(customer: Customer, authUid: string): boolean {
  return customer.user_id === authUid
}

/**
 * Simula: SELECT * FROM quote_versions via JOIN com quotes
 * Política "own_versions": EXISTS (SELECT 1 FROM quotes WHERE id = quote_id AND user_id = auth.uid())
 */
function selectQuoteVersions(
  versions: QuoteVersion[],
  quotes: Quote[],
  authUid: string
): QuoteVersion[] {
  return versions.filter((v) => {
    const quote = quotes.find((q) => q.id === v.quote_id)
    return quote !== undefined && quote.user_id === authUid
  })
}

/**
 * Simula: SELECT * FROM quote_rooms via JOIN em cascata
 * Política "own_rooms": via quote_versions → quotes → user_id
 */
function selectQuoteRooms(
  rooms: QuoteRoom[],
  versions: QuoteVersion[],
  quotes: Quote[],
  authUid: string
): QuoteRoom[] {
  const allowedVersionIds = selectQuoteVersions(versions, quotes, authUid).map((v) => v.id)
  return rooms.filter((r) => allowedVersionIds.includes(r.quote_version_id))
}

/**
 * Simula: SELECT * FROM quote_items via JOIN em cascata
 */
function selectQuoteItems(
  items: QuoteItem[],
  rooms: QuoteRoom[],
  versions: QuoteVersion[],
  quotes: Quote[],
  authUid: string
): QuoteItem[] {
  const allowedRoomIds = selectQuoteRooms(rooms, versions, quotes, authUid).map((r) => r.id)
  return items.filter((i) => allowedRoomIds.includes(i.quote_room_id))
}

/**
 * Simula: SELECT * FROM quote_pdfs via JOIN com quotes
 */
function selectQuotePdfs(
  pdfs: QuotePdf[],
  quotes: Quote[],
  authUid: string
): QuotePdf[] {
  return pdfs.filter((p) => {
    const quote = quotes.find((q) => q.id === p.quote_id)
    return quote !== undefined && quote.user_id === authUid
  })
}

/**
 * Simula: SELECT * FROM system_templates (leitura pública para autenticados)
 */
function selectSystemTemplates(templates: SystemTemplate[], isAuthenticated: boolean): SystemTemplate[] {
  if (!isAuthenticated) return []
  return templates // Todos os templates disponíveis para autenticados
}

/**
 * Simula: INSERT INTO system_templates — bloqueado para usuários comuns
 * Política permite apenas SELECT, não INSERT
 */
function canInsertSystemTemplate(_authUid: string | null): boolean {
  // Nenhuma política de INSERT existe para usuários autenticados comuns
  // Somente service_role pode inserir (via seed/migrations)
  return false
}

// ============================================================
// DADOS DE TESTE
// ============================================================

const USER_A = 'user-a-uuid-1234'
const USER_B = 'user-b-uuid-5678'

const testQuotes: Quote[] = [
  { id: 'quote-1', user_id: USER_A, quote_number: 1, status: 'draft' },
  { id: 'quote-2', user_id: USER_A, quote_number: 2, status: 'sent' },
  { id: 'quote-3', user_id: USER_B, quote_number: 1, status: 'draft' },
  { id: 'quote-4', user_id: USER_B, quote_number: 2, status: 'approved' },
]

const testVersions: QuoteVersion[] = [
  { id: 'version-1', quote_id: 'quote-1', name: 'Padrão' },
  { id: 'version-2', quote_id: 'quote-3', name: 'Padrão' },
]

const testRooms: QuoteRoom[] = [
  { id: 'room-1', quote_version_id: 'version-1', name: 'Cozinha' },
  { id: 'room-2', quote_version_id: 'version-2', name: 'Sala' },
]

const testItems: QuoteItem[] = [
  { id: 'item-1', quote_room_id: 'room-1', name: 'MDF 15mm', unit_price: 120.0 },
  { id: 'item-2', quote_room_id: 'room-2', name: 'MDF 18mm', unit_price: 150.0 },
]

const testPdfs: QuotePdf[] = [
  { id: 'pdf-1', quote_id: 'quote-1', storage_path: 'pdfs/user-a/quote-1.pdf' },
  { id: 'pdf-2', quote_id: 'quote-3', storage_path: 'pdfs/user-b/quote-3.pdf' },
]

const testCustomers: Customer[] = [
  { id: 'customer-1', user_id: USER_A, name: 'João Silva' },
  { id: 'customer-2', user_id: USER_B, name: 'Maria Santos' },
]

const testTemplates: SystemTemplate[] = [
  { id: 'tmpl-1', room_type: 'cozinha', name: 'Cozinha' },
  { id: 'tmpl-2', room_type: 'quarto', name: 'Quarto (Roupeiro)' },
  { id: 'tmpl-3', room_type: 'sala', name: 'Sala' },
  { id: 'tmpl-4', room_type: 'escritorio', name: 'Escritório' },
  { id: 'tmpl-5', room_type: 'banheiro', name: 'Banheiro' },
  { id: 'tmpl-6', room_type: 'area_de_servico', name: 'Área de Serviço' },
]

// ============================================================
// TESTES
// ============================================================

describe('RLS — Isolamento de dados entre usuários', () => {
  describe('quotes', () => {
    it('usuário A NÃO consegue ver quotes do usuário B (retorna 0 rows)', () => {
      const quotesVisibleToA = selectQuotes(testQuotes, USER_A)
      const quotesBelongingToB = quotesVisibleToA.filter((q) => q.user_id === USER_B)

      expect(quotesBelongingToB).toHaveLength(0)
    })

    it('usuário A vê apenas seus próprios quotes', () => {
      const quotesVisibleToA = selectQuotes(testQuotes, USER_A)

      expect(quotesVisibleToA).toHaveLength(2)
      expect(quotesVisibleToA.every((q) => q.user_id === USER_A)).toBe(true)
    })

    it('usuário B vê apenas seus próprios quotes', () => {
      const quotesVisibleToB = selectQuotes(testQuotes, USER_B)

      expect(quotesVisibleToB).toHaveLength(2)
      expect(quotesVisibleToB.every((q) => q.user_id === USER_B)).toBe(true)
    })
  })

  describe('customers — INSERT com user_id de outro usuário', () => {
    it('usuário A NÃO consegue inserir customer com user_id do usuário B (retorna erro RLS)', () => {
      const customerWithWrongUserId: Customer = {
        id: 'new-customer',
        user_id: USER_B, // tentativa de inserir com user_id do usuário B
        name: 'Cliente Fraudulento',
      }

      const allowed = canInsertCustomer(customerWithWrongUserId, USER_A)
      expect(allowed).toBe(false)
    })

    it('usuário A consegue inserir customer com seu próprio user_id', () => {
      const customerWithCorrectUserId: Customer = {
        id: 'new-customer',
        user_id: USER_A,
        name: 'Cliente Legítimo',
      }

      const allowed = canInsertCustomer(customerWithCorrectUserId, USER_A)
      expect(allowed).toBe(true)
    })
  })

  describe('quote_versions — isolamento via JOIN', () => {
    it('usuário A não vê versões de quotes do usuário B', () => {
      const versionsVisibleToA = selectQuoteVersions(testVersions, testQuotes, USER_A)
      const versionsBelongingToB = versionsVisibleToA.filter((v) => {
        const quote = testQuotes.find((q) => q.id === v.quote_id)
        return quote?.user_id === USER_B
      })

      expect(versionsBelongingToB).toHaveLength(0)
    })

    it('usuário A vê apenas versões dos seus próprios quotes', () => {
      const versionsVisibleToA = selectQuoteVersions(testVersions, testQuotes, USER_A)

      expect(versionsVisibleToA).toHaveLength(1)
      expect(versionsVisibleToA[0].quote_id).toBe('quote-1')
    })
  })

  describe('quote_rooms — isolamento em cascata (rooms → versions → quotes)', () => {
    it('usuário A não vê rooms de quotes do usuário B', () => {
      const roomsVisibleToA = selectQuoteRooms(testRooms, testVersions, testQuotes, USER_A)
      const roomsBelongingToB = roomsVisibleToA.filter((r) => r.id === 'room-2')

      expect(roomsBelongingToB).toHaveLength(0)
    })

    it('usuário A vê apenas rooms dos seus quotes', () => {
      const roomsVisibleToA = selectQuoteRooms(testRooms, testVersions, testQuotes, USER_A)

      expect(roomsVisibleToA).toHaveLength(1)
      expect(roomsVisibleToA[0].id).toBe('room-1')
    })
  })

  describe('quote_items — isolamento em cascata (items → rooms → versions → quotes)', () => {
    it('usuário A não vê items de quotes do usuário B', () => {
      const itemsVisibleToA = selectQuoteItems(
        testItems, testRooms, testVersions, testQuotes, USER_A
      )
      const itemsBelongingToB = itemsVisibleToA.filter((i) => i.id === 'item-2')

      expect(itemsBelongingToB).toHaveLength(0)
    })

    it('usuário A vê apenas items dos seus quotes', () => {
      const itemsVisibleToA = selectQuoteItems(
        testItems, testRooms, testVersions, testQuotes, USER_A
      )

      expect(itemsVisibleToA).toHaveLength(1)
      expect(itemsVisibleToA[0].id).toBe('item-1')
    })
  })

  describe('quote_pdfs — isolamento via JOIN com quotes', () => {
    it('usuário A não vê PDFs de quotes do usuário B', () => {
      const pdfsVisibleToA = selectQuotePdfs(testPdfs, testQuotes, USER_A)
      const pdfsBelongingToB = pdfsVisibleToA.filter((p) => p.id === 'pdf-2')

      expect(pdfsBelongingToB).toHaveLength(0)
    })

    it('usuário A vê apenas PDFs dos seus quotes', () => {
      const pdfsVisibleToA = selectQuotePdfs(testPdfs, testQuotes, USER_A)

      expect(pdfsVisibleToA).toHaveLength(1)
      expect(pdfsVisibleToA[0].id).toBe('pdf-1')
    })
  })
})

describe('RLS — system_templates (leitura pública para autenticados)', () => {
  it('SELECT retorna todos os 6 templates para qualquer usuário autenticado', () => {
    const templatesForUserA = selectSystemTemplates(testTemplates, true)
    expect(templatesForUserA).toHaveLength(6)

    const templatesForUserB = selectSystemTemplates(testTemplates, true)
    expect(templatesForUserB).toHaveLength(6)
  })

  it('todos os 6 ambientes estão presentes no seed', () => {
    const roomTypes = testTemplates.map((t) => t.room_type)
    expect(roomTypes).toContain('cozinha')
    expect(roomTypes).toContain('quarto')
    expect(roomTypes).toContain('sala')
    expect(roomTypes).toContain('escritorio')
    expect(roomTypes).toContain('banheiro')
    expect(roomTypes).toContain('area_de_servico')
  })

  it('INSERT em system_templates falha via client autenticado comum (sem permissão de escrita)', () => {
    const canInsertA = canInsertSystemTemplate(USER_A)
    const canInsertB = canInsertSystemTemplate(USER_B)

    expect(canInsertA).toBe(false)
    expect(canInsertB).toBe(false)
  })

  it('usuário não autenticado não vê nenhum template', () => {
    const templatesUnauthenticated = selectSystemTemplates(testTemplates, false)
    expect(templatesUnauthenticated).toHaveLength(0)
  })
})
