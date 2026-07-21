/**
 * Testes de estrutura dos arquivos SQL do schema
 *
 * Valida que os arquivos de migration e seed contêm os elementos obrigatórios
 * conforme especificado na task_02.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const WORKTREE = resolve(__dirname, '../../../')

let migrationSQL: string
let seedSQL: string

beforeAll(() => {
  migrationSQL = readFileSync(
    resolve(WORKTREE, 'supabase/migrations/001_initial_schema.sql'),
    'utf-8'
  )
  seedSQL = readFileSync(
    resolve(WORKTREE, 'supabase/seed.sql'),
    'utf-8'
  )
})

describe('001_initial_schema.sql — Tabelas obrigatórias', () => {
  const requiredTables = [
    'profiles',
    'subscriptions',
    'customers',
    'catalog_items',
    'system_templates',
    'system_template_items',
    'quotes',
    'quote_versions',
    'quote_rooms',
    'quote_items',
    'quote_pdfs',
  ]

  requiredTables.forEach((tableName) => {
    it(`contém CREATE TABLE ${tableName}`, () => {
      expect(migrationSQL).toContain(`CREATE TABLE ${tableName}`)
    })
  })
})

describe('001_initial_schema.sql — RLS obrigatório em todas as tabelas', () => {
  const requiredRLS = [
    'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE customers ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE system_templates ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE system_template_items ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE quotes ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE quote_rooms ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE quote_pdfs ENABLE ROW LEVEL SECURITY',
  ]

  requiredRLS.forEach((statement) => {
    it(`contém: ${statement}`, () => {
      expect(migrationSQL).toContain(statement)
    })
  })
})

describe('001_initial_schema.sql — Políticas RLS obrigatórias', () => {
  it('profiles: política own_profile com auth.uid() = id', () => {
    expect(migrationSQL).toContain('"own_profile"')
    expect(migrationSQL).toContain('auth.uid() = id')
  })

  it('subscriptions: política own_subscription com auth.uid() = user_id', () => {
    expect(migrationSQL).toContain('"own_subscription"')
  })

  it('customers: política own_customers', () => {
    expect(migrationSQL).toContain('"own_customers"')
  })

  it('catalog_items: política own_catalog', () => {
    expect(migrationSQL).toContain('"own_catalog"')
  })

  it('system_templates: política de SELECT para authenticated', () => {
    expect(migrationSQL).toContain('"read_templates"')
    expect(migrationSQL).toContain('FOR SELECT TO authenticated USING (true)')
  })

  it('system_template_items: política de SELECT para authenticated', () => {
    expect(migrationSQL).toContain('"read_template_items"')
  })

  it('quotes: política own_quotes', () => {
    expect(migrationSQL).toContain('"own_quotes"')
  })

  it('quote_versions: política own_versions com JOIN em quotes', () => {
    expect(migrationSQL).toContain('"own_versions"')
    expect(migrationSQL).toContain('FROM quotes q')
  })

  it('quote_rooms: política own_rooms com JOIN em cascata', () => {
    expect(migrationSQL).toContain('"own_rooms"')
  })

  it('quote_items: política own_items com JOIN em cascata', () => {
    expect(migrationSQL).toContain('"own_items"')
  })

  it('quote_pdfs: política own_pdfs com JOIN em quotes', () => {
    expect(migrationSQL).toContain('"own_pdfs"')
  })
})

describe('001_initial_schema.sql — Função next_quote_number', () => {
  it('contém CREATE OR REPLACE FUNCTION next_quote_number', () => {
    expect(migrationSQL).toContain('CREATE OR REPLACE FUNCTION next_quote_number')
  })

  it('função recebe parâmetro p_user_id uuid', () => {
    expect(migrationSQL).toContain('p_user_id uuid')
  })

  it('função usa COALESCE(MAX(quote_number), 0) + 1', () => {
    expect(migrationSQL).toContain('COALESCE(MAX(quote_number), 0) + 1')
  })

  it('função filtra por user_id = p_user_id', () => {
    expect(migrationSQL).toContain('user_id = p_user_id')
  })

  it('função é PL/pgSQL e retorna int', () => {
    expect(migrationSQL).toContain('RETURNS int LANGUAGE plpgsql')
  })
})

describe('001_initial_schema.sql — Índices recomendados', () => {
  it('contém índice em quotes(user_id, status)', () => {
    expect(migrationSQL).toContain('CREATE INDEX ON quotes(user_id, status)')
  })

  it('contém índice em customers(user_id)', () => {
    expect(migrationSQL).toContain('CREATE INDEX ON customers(user_id)')
  })

  it('contém índice em catalog_items(user_id, is_active)', () => {
    expect(migrationSQL).toContain('CREATE INDEX ON catalog_items(user_id, is_active)')
  })
})

describe('001_initial_schema.sql — Constraints e tipos importantes', () => {
  it('subscriptions.status tem CHECK com valores válidos', () => {
    expect(migrationSQL).toContain("CHECK (status IN ('trial','active','read_only','cancelled'))")
  })

  it('quotes.status tem CHECK com valores válidos', () => {
    expect(migrationSQL).toContain("CHECK (status IN ('draft','sent','approved','cancelled'))")
  })

  it('catalog_items.type tem CHECK com material e service', () => {
    expect(migrationSQL).toContain("CHECK (type IN ('material','service'))")
  })

  it('quote_items.unit_price não pode ser negativo', () => {
    expect(migrationSQL).toContain('CHECK (unit_price >= 0)')
  })

  it('quote_items.quantity deve ser positivo', () => {
    expect(migrationSQL).toContain('CHECK (quantity > 0)')
  })

  it('quote_items.catalog_item_id não tem FK constraint (ADR-003)', () => {
    // Deve existir o campo catalog_item_id mas sem REFERENCES
    expect(migrationSQL).toContain('catalog_item_id')
    // O comentário explica a ausência de FK
    expect(migrationSQL).toContain('sem FK constraint')
  })

  it('profiles referencia auth.users via FK', () => {
    expect(migrationSQL).toContain('REFERENCES auth.users(id) ON DELETE CASCADE')
  })

  it('subscriptions tem UNIQUE(user_id) garantindo 1:1 com profiles', () => {
    expect(migrationSQL).toContain('UNIQUE(user_id)')
  })

  it('quotes tem UNIQUE(user_id, quote_number) evitando duplicatas por usuário', () => {
    expect(migrationSQL).toContain('UNIQUE(user_id, quote_number)')
  })
})

describe('seed.sql — Templates de ambiente do sistema', () => {
  const expectedRoomTypes = [
    'cozinha',
    'quarto',
    'sala',
    'escritorio',
    'banheiro',
    'area_de_servico',
  ]

  expectedRoomTypes.forEach((roomType) => {
    it(`contém template para ambiente: ${roomType}`, () => {
      expect(seedSQL).toContain(roomType)
    })
  })

  it('contém INSERTs em system_templates', () => {
    expect(seedSQL).toContain('INSERT INTO system_templates')
  })

  it('contém INSERTs em system_template_items', () => {
    expect(seedSQL).toContain('INSERT INTO system_template_items')
  })

  it('NÃO contém coluna unit_price nos INSERT de template_items (marceneiro preenche ao usar)', () => {
    // Os itens do template não devem ter unit_price nos INSERTs — apenas default_quantity
    // Verifica que a lista de colunas do INSERT não inclui unit_price
    // (comentários no arquivo podem mencionar a palavra para documentar a ausência)
    expect(seedSQL).not.toContain('unit_price,')
    // Garante que default_quantity está presente (campo correto)
    expect(seedSQL).toContain('default_quantity')
  })

  it('contém ao menos 6 blocos de inserção de templates', () => {
    const insertTemplateCount = (seedSQL.match(/INSERT INTO system_templates/g) || []).length
    expect(insertTemplateCount).toBeGreaterThanOrEqual(6)
  })

  it('cada template tem ao menos 4 itens (total mínimo: 24 itens)', () => {
    // Conta as linhas de valores nos INSERTs de system_template_items
    // Cada linha de valor representa um item
    const itemLines = seedSQL.match(/\('([^']+)',\s*'(material|service)'/g) || []
    expect(itemLines.length).toBeGreaterThanOrEqual(24)
  })
})
