/**
 * Testes de estrutura das migrations da Fase 2 (011–015)
 *
 * Valida que os arquivos de migration contêm os elementos obrigatórios
 * conforme especificado na task_01.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const WORKTREE = resolve(__dirname, '../../../')
const MIGRATIONS = resolve(WORKTREE, 'supabase/migrations')

function readMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS, filename), 'utf-8')
}

// ---------------------------------------------------------------------------
// Migration 011 — quotes: campos de aprovação e rastreamento
// ---------------------------------------------------------------------------
describe('011_approval_token.sql — colunas em quotes', () => {
  let sql: string

  beforeAll(() => {
    sql = readMigration('011_approval_token.sql')
  })

  it('adiciona coluna approval_token uuid UNIQUE', () => {
    expect(sql).toContain('approval_token')
    expect(sql).toContain('uuid')
    expect(sql).toContain('UNIQUE')
  })

  it('adiciona coluna approval_token_expires_at timestamptz', () => {
    expect(sql).toContain('approval_token_expires_at')
    expect(sql).toContain('timestamptz')
  })

  it('adiciona coluna sent_at timestamptz', () => {
    expect(sql).toContain('sent_at')
  })

  it('adiciona coluna followup_notified_at timestamptz', () => {
    expect(sql).toContain('followup_notified_at')
  })

  it('adiciona coluna expiry_notified_at timestamptz', () => {
    expect(sql).toContain('expiry_notified_at')
  })

  it('usa IF NOT EXISTS em ADD COLUMN (reentrância)', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS')
  })

  it('cria índice quotes_approval_token_idx', () => {
    expect(sql).toContain('quotes_approval_token_idx')
  })

  it('índice de approval_token usa WHERE approval_token IS NOT NULL', () => {
    expect(sql).toContain('WHERE approval_token IS NOT NULL')
  })

  it('cria índice quotes_sent_at_idx em (user_id, status, sent_at)', () => {
    expect(sql).toContain('quotes_sent_at_idx')
    expect(sql).toContain('user_id, status, sent_at')
  })

  it('índice de sent_at usa WHERE status = \'sent\'', () => {
    expect(sql).toContain("WHERE status = 'sent'")
  })

  it('usa IF NOT EXISTS em CREATE INDEX (reentrância)', () => {
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS')
  })
})

// ---------------------------------------------------------------------------
// Migration 012 — profiles: novos campos de configuração
// ---------------------------------------------------------------------------
describe('012_profile_fase2_settings.sql — colunas em profiles', () => {
  let sql: string

  beforeAll(() => {
    sql = readMigration('012_profile_fase2_settings.sql')
  })

  it('adiciona coluna followup_days int NOT NULL DEFAULT 5', () => {
    expect(sql).toContain('followup_days')
    expect(sql).toContain('DEFAULT 5')
  })

  it('adiciona coluna price_alert_days int NOT NULL DEFAULT 60', () => {
    expect(sql).toContain('price_alert_days')
    expect(sql).toContain('DEFAULT 60')
  })

  it('adiciona coluna sheet_waste_pct numeric(4,2) NOT NULL DEFAULT 15', () => {
    expect(sql).toContain('sheet_waste_pct')
    expect(sql).toContain('numeric(4,2)')
    expect(sql).toContain('DEFAULT 15')
  })

  it('adiciona coluna whatsapp_message_template text', () => {
    expect(sql).toContain('whatsapp_message_template')
    expect(sql).toContain('text')
  })

  it('usa IF NOT EXISTS em ADD COLUMN (reentrância)', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS')
  })

  it('altera a tabela profiles', () => {
    expect(sql).toContain('ALTER TABLE profiles')
  })
})

// ---------------------------------------------------------------------------
// Migration 013 — catalog_items: rastreamento de atualização de preço
// ---------------------------------------------------------------------------
describe('013_catalog_price_tracking.sql — price_updated_at em catalog_items', () => {
  let sql: string

  beforeAll(() => {
    sql = readMigration('013_catalog_price_tracking.sql')
  })

  it('adiciona coluna price_updated_at timestamptz', () => {
    expect(sql).toContain('price_updated_at')
    expect(sql).toContain('timestamptz')
  })

  it('coluna price_updated_at tem DEFAULT now()', () => {
    expect(sql).toContain('DEFAULT now()')
  })

  it('usa IF NOT EXISTS em ADD COLUMN (reentrância)', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS')
  })

  it('faz backfill: SET price_updated_at = created_at', () => {
    expect(sql).toContain('price_updated_at = created_at')
  })

  it('cria índice catalog_items_price_updated_idx em (user_id, price_updated_at)', () => {
    expect(sql).toContain('catalog_items_price_updated_idx')
    expect(sql).toContain('user_id, price_updated_at')
  })

  it('usa IF NOT EXISTS em CREATE INDEX (reentrância)', () => {
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS')
  })
})

// ---------------------------------------------------------------------------
// Migration 014 — nova tabela quote_room_photos
// ---------------------------------------------------------------------------
describe('014_quote_room_photos.sql — tabela e RLS', () => {
  let sql: string

  beforeAll(() => {
    sql = readMigration('014_quote_room_photos.sql')
  })

  it('cria tabela quote_room_photos', () => {
    expect(sql).toContain('quote_room_photos')
    expect(sql).toContain('CREATE TABLE')
  })

  it('usa IF NOT EXISTS na criação da tabela (reentrância)', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS')
  })

  it('tem coluna id uuid PRIMARY KEY', () => {
    expect(sql).toContain('id')
    expect(sql).toContain('uuid')
    expect(sql).toContain('PRIMARY KEY')
    expect(sql).toContain('gen_random_uuid()')
  })

  it('tem coluna room_id uuid NOT NULL com FK em quote_rooms', () => {
    expect(sql).toContain('room_id')
    expect(sql).toContain('REFERENCES quote_rooms(id)')
    expect(sql).toContain('ON DELETE CASCADE')
  })

  it('tem coluna image_url text NOT NULL', () => {
    expect(sql).toContain('image_url')
  })

  it('tem coluna position int NOT NULL DEFAULT 0', () => {
    expect(sql).toContain('position')
    expect(sql).toContain('DEFAULT 0')
  })

  it('cria índice quote_room_photos_room_idx em room_id', () => {
    expect(sql).toContain('quote_room_photos_room_idx')
  })

  it('habilita RLS na tabela', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })

  it('cria política own_room_photos', () => {
    expect(sql).toContain('own_room_photos')
  })

  it('política usa JOIN com quote_rooms, quote_versions e quotes', () => {
    expect(sql).toContain('quote_rooms')
    expect(sql).toContain('quote_versions')
    expect(sql).toContain('quotes')
    expect(sql).toContain('auth.uid()')
  })
})

// ---------------------------------------------------------------------------
// Migration 015 — bucket quote-photos
// ---------------------------------------------------------------------------
describe('015_quote_photos_bucket.sql — bucket de storage', () => {
  let sql: string

  beforeAll(() => {
    sql = readMigration('015_quote_photos_bucket.sql')
  })

  it('insere em storage.buckets', () => {
    expect(sql).toContain('storage.buckets')
    expect(sql).toContain('INSERT INTO')
  })

  it('bucket tem id = quote-photos', () => {
    expect(sql).toContain("'quote-photos'")
  })

  it('bucket tem public = false', () => {
    expect(sql).toContain('false')
  })

  it('usa ON CONFLICT DO NOTHING (reentrância)', () => {
    expect(sql).toContain('ON CONFLICT DO NOTHING')
  })
})

// ---------------------------------------------------------------------------
// Verificação de nomenclatura e sequência
// ---------------------------------------------------------------------------
describe('Nomenclatura e sequência das migrations', () => {
  const migrationFiles = [
    '011_approval_token.sql',
    '012_profile_fase2_settings.sql',
    '013_catalog_price_tracking.sql',
    '014_quote_room_photos.sql',
    '015_quote_photos_bucket.sql',
  ]

  migrationFiles.forEach((filename) => {
    it(`arquivo ${filename} existe e é legível`, () => {
      const content = readMigration(filename)
      expect(content.length).toBeGreaterThan(0)
    })
  })

  it('migration 011 não conflita com migrações existentes (001–010)', () => {
    const content = readMigration('011_approval_token.sql')
    // O arquivo deve ser uma migration nova (ALTER TABLE, não CREATE TABLE quotes)
    expect(content).toContain('ALTER TABLE quotes')
    expect(content).not.toContain('CREATE TABLE quotes')
  })
})
