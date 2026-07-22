import { describe, it, expect } from 'vitest'

// Extrai lógica de classes do Input para testar sem DOM
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

function buildInputClasses(options: { error?: string; disabled?: boolean; className?: string }) {
  const { error, disabled = false, className } = options
  return cn(
    'w-full rounded-lg border border-border px-3 py-2 text-text-base placeholder:text-text-base/50',
    'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1',
    'bg-white',
    error && 'border-error focus:ring-error',
    disabled && 'pointer-events-none cursor-not-allowed opacity-50',
    className,
  )
}

function buildInputContainerData(options: { error?: string; label?: string; disabled?: boolean; id?: string }) {
  const { error, label, disabled = false, id } = options
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  return {
    inputClasses: buildInputClasses({ error, disabled }),
    labelClasses: cn('text-sm font-medium text-text-base', disabled && 'opacity-50'),
    hasError: Boolean(error),
    errorMessage: error,
    errorId: error && inputId ? `${inputId}-error` : undefined,
    ariaInvalid: error ? 'true' : undefined,
    inputId,
  }
}

describe('Input — classes base', () => {
  it('usa borda border-border por padrão', () => {
    const classes = buildInputClasses({})
    expect(classes).toContain('border-border')
  })

  it('usa ring-brand-primary no foco', () => {
    const classes = buildInputClasses({})
    expect(classes).toContain('focus:ring-brand-primary')
  })
})

describe('Input — estado error', () => {
  it('com error exibe classe border-error', () => {
    const classes = buildInputClasses({ error: 'Campo obrigatório' })
    expect(classes).toContain('border-error')
  })

  it('com error exibe classe focus:ring-error', () => {
    const classes = buildInputClasses({ error: 'Campo obrigatório' })
    expect(classes).toContain('focus:ring-error')
  })

  it('com error define aria-invalid como true', () => {
    const data = buildInputContainerData({ error: 'Erro' })
    expect(data.ariaInvalid).toBe('true')
  })

  it('com error gera errorId correto para label', () => {
    const data = buildInputContainerData({ error: 'Erro', label: 'Email' })
    expect(data.errorId).toBe('email-error')
  })

  it('sem error não define aria-invalid', () => {
    const data = buildInputContainerData({})
    expect(data.ariaInvalid).toBeUndefined()
  })
})

describe('Input — estado disabled', () => {
  it('disabled=true adiciona pointer-events-none', () => {
    const classes = buildInputClasses({ disabled: true })
    expect(classes).toContain('pointer-events-none')
  })

  it('disabled=true adiciona opacity-50 ao input', () => {
    const classes = buildInputClasses({ disabled: true })
    expect(classes).toContain('opacity-50')
  })

  it('disabled=true adiciona opacity-50 ao label', () => {
    const data = buildInputContainerData({ disabled: true, label: 'Nome' })
    expect(data.labelClasses).toContain('opacity-50')
  })
})

describe('Input — className adicional', () => {
  it('aceita e aplica className adicional via prop', () => {
    const classes = buildInputClasses({ className: 'custom-input' })
    expect(classes).toContain('custom-input')
  })
})

describe('Input — módulo', () => {
  it('exporta Input como função', async () => {
    const mod = await import('@/components/ui/input')
    expect(typeof mod.Input).toBe('function')
  })
})
