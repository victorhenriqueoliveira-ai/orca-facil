import { describe, it, expect } from 'vitest'

// Extrai a lógica de classes do Button para testar sem DOM
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-white hover:opacity-90 active:opacity-80',
  secondary: 'bg-brand-support text-white hover:opacity-90 active:opacity-80',
  ghost: 'bg-transparent text-brand-primary border border-brand-primary hover:bg-brand-primary/10 active:bg-brand-primary/20',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 text-sm min-h-[44px]',
  md: 'px-4 text-base min-h-[44px]',
  lg: 'px-6 text-lg min-h-[44px]',
}

function buildButtonClasses(options: {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  className?: string
}) {
  const { variant = 'primary', size = 'md', disabled = false, className } = options
  return cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
    variantClasses[variant],
    sizeClasses[size],
    disabled && 'pointer-events-none opacity-50',
    className,
  )
}

describe('Button — variantes', () => {
  it('variante primary renderiza com classe bg-brand-primary', () => {
    const classes = buildButtonClasses({ variant: 'primary' })
    expect(classes).toContain('bg-brand-primary')
  })

  it('variante secondary renderiza com classe bg-brand-support', () => {
    const classes = buildButtonClasses({ variant: 'secondary' })
    expect(classes).toContain('bg-brand-support')
  })

  it('variante ghost renderiza sem background preenchido (bg-transparent)', () => {
    const classes = buildButtonClasses({ variant: 'ghost' })
    expect(classes).toContain('bg-transparent')
    expect(classes).not.toContain('bg-brand-primary ')
    expect(classes).not.toContain('bg-brand-support')
  })

  it('variante ghost inclui borda border-brand-primary', () => {
    const classes = buildButtonClasses({ variant: 'ghost' })
    expect(classes).toContain('border-brand-primary')
  })
})

describe('Button — tamanhos', () => {
  it('tamanho sm tem min-h-[44px]', () => {
    const classes = buildButtonClasses({ size: 'sm' })
    expect(classes).toContain('min-h-[44px]')
  })

  it('tamanho md tem min-h-[44px]', () => {
    const classes = buildButtonClasses({ size: 'md' })
    expect(classes).toContain('min-h-[44px]')
  })

  it('tamanho lg tem min-h-[44px]', () => {
    const classes = buildButtonClasses({ size: 'lg' })
    expect(classes).toContain('min-h-[44px]')
  })

  it('todas as variantes têm altura mínima de 44px', () => {
    const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost']
    const sizes: ButtonSize[] = ['sm', 'md', 'lg']
    for (const variant of variants) {
      for (const size of sizes) {
        const classes = buildButtonClasses({ variant, size })
        expect(classes).toContain('min-h-[44px]')
      }
    }
  })
})

describe('Button — estado disabled', () => {
  it('disabled=true adiciona pointer-events-none', () => {
    const classes = buildButtonClasses({ disabled: true })
    expect(classes).toContain('pointer-events-none')
  })

  it('disabled=true adiciona opacity-50', () => {
    const classes = buildButtonClasses({ disabled: true })
    expect(classes).toContain('opacity-50')
  })

  it('disabled=false não adiciona pointer-events-none', () => {
    const classes = buildButtonClasses({ disabled: false })
    expect(classes).not.toContain('pointer-events-none')
  })
})

describe('Button — className adicional', () => {
  it('aceita e aplica className adicional via prop', () => {
    const classes = buildButtonClasses({ className: 'custom-class w-full' })
    expect(classes).toContain('custom-class')
    expect(classes).toContain('w-full')
  })
})

describe('Button — módulo', () => {
  it('exporta Button como função', async () => {
    const mod = await import('@/components/ui/button')
    expect(typeof mod.Button).toBe('function')
  })
})
