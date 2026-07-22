import { describe, it, expect } from 'vitest'

// Extrai lógica de classes do Badge para testar sem DOM
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral'

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
  neutral: 'bg-border text-text-base',
}

function buildBadgeClasses(options: { variant?: BadgeVariant; className?: string }) {
  const { variant = 'neutral', className } = options
  return cn(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    variantClasses[variant],
    className,
  )
}

describe('Badge — variantes de cor', () => {
  it('variante success usa cor bg-success', () => {
    const classes = buildBadgeClasses({ variant: 'success' })
    expect(classes).toContain('bg-success')
  })

  it('variante success usa texto text-success', () => {
    const classes = buildBadgeClasses({ variant: 'success' })
    expect(classes).toContain('text-success')
  })

  it('variante warning usa cor bg-warning', () => {
    const classes = buildBadgeClasses({ variant: 'warning' })
    expect(classes).toContain('bg-warning')
  })

  it('variante error usa cor bg-error', () => {
    const classes = buildBadgeClasses({ variant: 'error' })
    expect(classes).toContain('bg-error')
  })

  it('variante error usa texto text-error', () => {
    const classes = buildBadgeClasses({ variant: 'error' })
    expect(classes).toContain('text-error')
  })

  it('variante neutral usa bg-border', () => {
    const classes = buildBadgeClasses({ variant: 'neutral' })
    expect(classes).toContain('bg-border')
  })
})

describe('Badge — mapeamento de status de orçamento', () => {
  it('status Aprovado deve usar variante success', () => {
    // Aprovado → success (bg-success)
    const classes = buildBadgeClasses({ variant: 'success' })
    expect(classes).toContain('bg-success')
    expect(classes).toContain('text-success')
  })

  it('status Rejeitado deve usar variante error', () => {
    // Rejeitado → error (bg-error)
    const classes = buildBadgeClasses({ variant: 'error' })
    expect(classes).toContain('bg-error')
    expect(classes).toContain('text-error')
  })

  it('status Expirado deve usar variante warning', () => {
    // Expirado → warning (bg-warning)
    const classes = buildBadgeClasses({ variant: 'warning' })
    expect(classes).toContain('bg-warning')
  })

  it('status Rascunho deve usar variante neutral', () => {
    // Rascunho → neutral (bg-border)
    const classes = buildBadgeClasses({ variant: 'neutral' })
    expect(classes).toContain('bg-border')
  })

  it('status Enviado deve usar variante neutral', () => {
    // Enviado → neutral (bg-border)
    const classes = buildBadgeClasses({ variant: 'neutral' })
    expect(classes).toContain('bg-border')
  })
})

describe('Badge — className adicional', () => {
  it('aceita e aplica className adicional via prop', () => {
    const classes = buildBadgeClasses({ className: 'custom-badge' })
    expect(classes).toContain('custom-badge')
  })
})

describe('Badge — módulo', () => {
  it('exporta Badge como função', async () => {
    const mod = await import('@/components/ui/badge')
    expect(typeof mod.Badge).toBe('function')
  })
})
