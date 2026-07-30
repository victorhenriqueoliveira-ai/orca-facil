import type { Metadata } from 'next'
import { LandingClient } from './landing-client'

export const metadata: Metadata = {
  title: { absolute: 'Orça Fácil — Orçamentos de Móveis Planejados para Marceneiros' },
  description:
    'Crie orçamentos profissionais de móveis planejados em minutos. Catálogo de materiais, PDF automático e controle de clientes. Experimente grátis por 30 dias.',
  openGraph: {
    title: 'Orça Fácil — Orçamentos para Marceneiros',
    description: 'Crie orçamentos profissionais de móveis planejados em minutos.',
    url: 'https://orcafacil.com.br',
  },
}

export default function LandingPage() {
  return <LandingClient />
}
