import React from 'react'

// Utilitário simples de merge de classes (sem dependência externa)
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral'

export type BadgeProps = {
  variant?: BadgeVariant
  className?: string
  children?: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
  neutral: 'bg-border text-text-base',
}

/**
 * Mapeamento de status de orçamento para variante do Badge:
 * - Rascunho → neutral
 * - Enviado  → neutral
 * - Aprovado → success
 * - Rejeitado → error
 * - Expirado  → warning
 */
export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
