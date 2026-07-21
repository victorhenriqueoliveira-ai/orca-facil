/**
 * Testes unitários para a lógica da função next_quote_number
 *
 * A função no Postgres é:
 *   SELECT COALESCE(MAX(quote_number), 0) + 1
 *   FROM quotes WHERE user_id = p_user_id;
 *
 * Estes testes validam a lógica equivalente em TypeScript,
 * sem necessidade de banco de dados real.
 */

import { describe, it, expect } from 'vitest'

/**
 * Simula a lógica da função PL/pgSQL next_quote_number.
 * Recebe um array de quote_number existentes para o usuário e retorna o próximo.
 */
function nextQuoteNumber(existingNumbers: number[]): number {
  const max = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
  return max + 1
}

/**
 * Simula uma tabela de orçamentos em memória para múltiplos usuários.
 */
interface MockQuote {
  user_id: string
  quote_number: number
}

function nextQuoteNumberForUser(quotes: MockQuote[], userId: string): number {
  const userNumbers = quotes
    .filter((q) => q.user_id === userId)
    .map((q) => q.quote_number)
  return nextQuoteNumber(userNumbers)
}

describe('next_quote_number', () => {
  describe('usuário sem orçamentos anteriores', () => {
    it('retorna 1 quando não há orçamentos', () => {
      const quotes: MockQuote[] = []
      const result = nextQuoteNumberForUser(quotes, 'user-a')
      expect(result).toBe(1)
    })

    it('retorna 1 para novo usuário mesmo com orçamentos de outros usuários', () => {
      const quotes: MockQuote[] = [
        { user_id: 'user-b', quote_number: 1 },
        { user_id: 'user-b', quote_number: 2 },
        { user_id: 'user-b', quote_number: 3 },
      ]
      const result = nextQuoteNumberForUser(quotes, 'user-a')
      expect(result).toBe(1)
    })
  })

  describe('usuário com orçamentos existentes', () => {
    it('retorna MAX(quote_number) + 1', () => {
      const quotes: MockQuote[] = [
        { user_id: 'user-a', quote_number: 1 },
        { user_id: 'user-a', quote_number: 2 },
        { user_id: 'user-a', quote_number: 3 },
      ]
      const result = nextQuoteNumberForUser(quotes, 'user-a')
      expect(result).toBe(4)
    })

    it('retorna MAX + 1 mesmo com numeração não contígua', () => {
      // Simula orçamentos onde um foi cancelado/deletado, criando gap na sequência
      const quotes: MockQuote[] = [
        { user_id: 'user-a', quote_number: 1 },
        { user_id: 'user-a', quote_number: 3 }, // gap no 2
        { user_id: 'user-a', quote_number: 5 }, // gap no 4
      ]
      const result = nextQuoteNumberForUser(quotes, 'user-a')
      expect(result).toBe(6)
    })

    it('retorna 2 para usuário com apenas um orçamento', () => {
      const quotes: MockQuote[] = [{ user_id: 'user-a', quote_number: 1 }]
      const result = nextQuoteNumberForUser(quotes, 'user-a')
      expect(result).toBe(2)
    })
  })

  describe('sequências independentes por usuário', () => {
    it('dois usuários têm sequências independentes', () => {
      const quotes: MockQuote[] = [
        { user_id: 'user-a', quote_number: 1 },
        { user_id: 'user-a', quote_number: 2 },
        { user_id: 'user-a', quote_number: 3 },
        { user_id: 'user-b', quote_number: 1 },
      ]

      const nextA = nextQuoteNumberForUser(quotes, 'user-a')
      const nextB = nextQuoteNumberForUser(quotes, 'user-b')

      expect(nextA).toBe(4)
      expect(nextB).toBe(2)
    })

    it('usuário B com muitos orçamentos não afeta sequência do usuário A', () => {
      const quotes: MockQuote[] = [
        { user_id: 'user-b', quote_number: 1 },
        { user_id: 'user-b', quote_number: 2 },
        { user_id: 'user-b', quote_number: 100 },
        { user_id: 'user-a', quote_number: 1 },
      ]

      const nextA = nextQuoteNumberForUser(quotes, 'user-a')
      expect(nextA).toBe(2) // Não é 101

      const nextB = nextQuoteNumberForUser(quotes, 'user-b')
      expect(nextB).toBe(101)
    })

    it('três usuários mantêm sequências completamente separadas', () => {
      const quotes: MockQuote[] = [
        { user_id: 'user-a', quote_number: 1 },
        { user_id: 'user-b', quote_number: 1 },
        { user_id: 'user-b', quote_number: 2 },
        { user_id: 'user-c', quote_number: 1 },
        { user_id: 'user-c', quote_number: 2 },
        { user_id: 'user-c', quote_number: 3 },
      ]

      expect(nextQuoteNumberForUser(quotes, 'user-a')).toBe(2)
      expect(nextQuoteNumberForUser(quotes, 'user-b')).toBe(3)
      expect(nextQuoteNumberForUser(quotes, 'user-c')).toBe(4)
    })
  })

  describe('casos extremos', () => {
    it('funciona com quote_number alto', () => {
      const quotes: MockQuote[] = [
        { user_id: 'user-a', quote_number: 9999 },
      ]
      expect(nextQuoteNumberForUser(quotes, 'user-a')).toBe(10000)
    })

    it('COALESCE garante retorno de 0 quando não há orçamentos (base para +1)', () => {
      // Simula a lógica COALESCE(MAX(quote_number), 0) + 1
      const emptyUserNumbers: number[] = []
      const maxOrZero = emptyUserNumbers.length > 0 ? Math.max(...emptyUserNumbers) : 0
      expect(maxOrZero).toBe(0)
      expect(maxOrZero + 1).toBe(1)
    })
  })
})
