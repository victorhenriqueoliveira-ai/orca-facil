import React from 'react'

// Utilitário simples de merge de classes (sem dependência externa)
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export type CardProps = {
  className?: string
  children?: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-bg-base shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

export type CardHeaderProps = {
  className?: string
  children?: React.ReactNode
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-border', className)}>
      {children}
    </div>
  )
}

export type CardBodyProps = {
  className?: string
  children?: React.ReactNode
}

export function CardBody({ className, children }: CardBodyProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}
