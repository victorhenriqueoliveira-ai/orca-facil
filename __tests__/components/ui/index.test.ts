import { describe, it, expect } from 'vitest'

describe('components/ui/index — re-exports', () => {
  it('exporta Button', async () => {
    const mod = await import('@/components/ui/index')
    expect(typeof mod.Button).toBe('function')
  })

  it('exporta Input', async () => {
    const mod = await import('@/components/ui/index')
    expect(typeof mod.Input).toBe('function')
  })

  it('exporta Card', async () => {
    const mod = await import('@/components/ui/index')
    expect(typeof mod.Card).toBe('function')
  })

  it('exporta CardHeader', async () => {
    const mod = await import('@/components/ui/index')
    expect(typeof mod.CardHeader).toBe('function')
  })

  it('exporta CardBody', async () => {
    const mod = await import('@/components/ui/index')
    expect(typeof mod.CardBody).toBe('function')
  })

  it('exporta Badge', async () => {
    const mod = await import('@/components/ui/index')
    expect(typeof mod.Badge).toBe('function')
  })
})
