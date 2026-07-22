import React from 'react'

// Utilitário simples de merge de classes (sem dependência externa)
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-primary text-white hover:opacity-90 active:opacity-80',
  secondary:
    'bg-brand-support text-white hover:opacity-90 active:opacity-80',
  ghost:
    'bg-transparent text-brand-primary border border-brand-primary hover:bg-brand-primary/10 active:bg-brand-primary/20',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 text-sm min-h-[44px]',
  md: 'px-4 text-base min-h-[44px]',
  lg: 'px-6 text-lg min-h-[44px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
