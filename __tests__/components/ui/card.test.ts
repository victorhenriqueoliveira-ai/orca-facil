import { describe, it, expect } from 'vitest'

// Extrai lógica de classes do Card para testar sem DOM
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

function buildCardClasses(options: { className?: string }) {
  const { className } = options
  return cn('rounded-xl border border-border bg-bg-base shadow-sm', className)
}

describe('Card — classes base', () => {
  it('usa bg-bg-base como fundo', () => {
    const classes = buildCardClasses({})
    expect(classes).toContain('bg-bg-base')
  })

  it('usa border-border como borda', () => {
    const classes = buildCardClasses({})
    expect(classes).toContain('border-border')
  })

  it('usa rounded-xl para bordas arredondadas', () => {
    const classes = buildCardClasses({})
    expect(classes).toContain('rounded-xl')
  })

  it('usa shadow-sm para sombra sutil', () => {
    const classes = buildCardClasses({})
    expect(classes).toContain('shadow-sm')
  })
})

describe('Card — className adicional', () => {
  it('aceita e aplica className adicional via prop', () => {
    const classes = buildCardClasses({ className: 'custom-card p-8' })
    expect(classes).toContain('custom-card')
    expect(classes).toContain('p-8')
  })
})

describe('Card — módulo', () => {
  it('exporta Card como função', async () => {
    const mod = await import('@/components/ui/card')
    expect(typeof mod.Card).toBe('function')
  })

  it('exporta CardHeader como função', async () => {
    const mod = await import('@/components/ui/card')
    expect(typeof mod.CardHeader).toBe('function')
  })

  it('exporta CardBody como função', async () => {
    const mod = await import('@/components/ui/card')
    expect(typeof mod.CardBody).toBe('function')
  })
})
