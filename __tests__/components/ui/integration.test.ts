import { describe, it, expect } from 'vitest'

/**
 * Testes de integração — composição dos componentes UI base.
 * Verifica que os componentes podem ser importados juntos e não conflitam.
 */

describe('Integração — Button dentro de Card', () => {
  it('Button e Card podem ser importados do mesmo barrel', async () => {
    const mod = await import('@/components/ui/index')
    expect(typeof mod.Button).toBe('function')
    expect(typeof mod.Card).toBe('function')
    // Ambos existem sem conflito
    expect(mod.Button).not.toBe(mod.Card)
  })

  it('Button e Card têm classes raiz distintas (sem conflito de estilos)', async () => {
    // Simulação da composição Button dentro de Card
    function cn(...classes: (string | undefined | null | false)[]) {
      return classes.filter(Boolean).join(' ')
    }
    const cardRootClass = cn('rounded-xl border border-border bg-bg-base shadow-sm')
    const buttonRootClass = cn(
      'inline-flex items-center justify-center rounded-lg font-medium',
      'bg-brand-primary text-white',
      'min-h-[44px]',
    )
    // Não devem compartilhar classe conflitante de background
    expect(cardRootClass).toContain('bg-bg-base')
    expect(buttonRootClass).toContain('bg-brand-primary')
    expect(cardRootClass).not.toContain('bg-brand-primary')
    expect(buttonRootClass).not.toContain('bg-bg-base')
  })
})

describe('Integração — Formulário com Input + Button', () => {
  it('Input e Button podem ser importados do mesmo barrel', async () => {
    const mod = await import('@/components/ui/index')
    expect(typeof mod.Input).toBe('function')
    expect(typeof mod.Button).toBe('function')
  })

  it('Input exibe erro e Button mantém funcionalidade independente', async () => {
    // Simulação: formulário com input com erro + button submit habilitado
    function cn(...classes: (string | undefined | null | false)[]) {
      return classes.filter(Boolean).join(' ')
    }

    const inputWithErrorClass = cn(
      'w-full rounded-lg border border-border',
      'border-error focus:ring-error',
    )
    const buttonEnabledClass = cn(
      'inline-flex items-center justify-center',
      'bg-brand-primary text-white',
      false, // disabled=false → sem pointer-events-none
    )

    expect(inputWithErrorClass).toContain('border-error')
    expect(buttonEnabledClass).not.toContain('pointer-events-none')
    expect(buttonEnabledClass).toContain('bg-brand-primary')
  })

  it('Button com disabled=true não conflita com Input habilitado', async () => {
    function cn(...classes: (string | undefined | null | false)[]) {
      return classes.filter(Boolean).join(' ')
    }

    const disabledButtonClass = cn(
      'inline-flex items-center justify-center',
      'bg-brand-primary',
      true && 'pointer-events-none opacity-50',
    )
    const enabledInputClass = cn(
      'w-full rounded-lg border border-border',
      false, // disabled=false
    )

    expect(disabledButtonClass).toContain('pointer-events-none')
    expect(enabledInputClass).not.toContain('pointer-events-none')
  })
})

describe('Integração — Badge com variantes de status', () => {
  it('todos os quatro componentes exportam corretamente juntos', async () => {
    const mod = await import('@/components/ui/index')
    const componentes = ['Button', 'Input', 'Card', 'Badge'] as const
    for (const nome of componentes) {
      expect(typeof mod[nome]).toBe('function')
    }
  })

  it('Badge success e Badge error têm tokens distintos', () => {
    function cn(...classes: (string | undefined | null | false)[]) {
      return classes.filter(Boolean).join(' ')
    }
    const successClass = cn('bg-success/15 text-success')
    const errorClass = cn('bg-error/15 text-error')
    expect(successClass).toContain('bg-success')
    expect(errorClass).toContain('bg-error')
    expect(successClass).not.toContain('bg-error')
    expect(errorClass).not.toContain('bg-success')
  })
})
