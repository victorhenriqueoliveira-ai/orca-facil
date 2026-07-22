import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pagePath = resolve(__dirname, '../../app/page.tsx')
let pageContent: string

beforeEach(() => {
  pageContent = readFileSync(pagePath, 'utf-8')
})

describe('Landing Page (app/page.tsx) — Estrutura Geral', () => {
  it('é um Server Component puro (sem "use client")', () => {
    expect(pageContent).not.toContain('"use client"')
    expect(pageContent).not.toContain("'use client'")
  })

  it('exporta metadata com title contendo "Orça Fácil"', () => {
    expect(pageContent).toContain('export const metadata')
    expect(pageContent).toContain('Orça Fácil')
  })

  it('metadata.title usa { absolute: ... } para sobrescrever o template do root layout', () => {
    expect(pageContent).toContain('title: { absolute:')
  })

  it('metadata.title não é o valor padrão do Next.js', () => {
    expect(pageContent).not.toContain('Create Next App')
  })

  it('metadata.description é não-vazia e específica ao produto', () => {
    expect(pageContent).toContain('description:')
    expect(pageContent).toContain('marceneiro')
  })

  it('metadata.openGraph contém og:title, og:description e og:url', () => {
    expect(pageContent).toContain('openGraph:')
    expect(pageContent).toContain('orcafacil.com.br')
  })
})

describe('Landing Page — Seção Hero', () => {
  it('contém o texto "Testar Grátis" no hero', () => {
    expect(pageContent).toContain('Testar Grátis')
  })

  it('hero tem link para /cadastro', () => {
    expect(pageContent).toContain('/cadastro')
  })

  it('headline principal menciona "orçamentos de móveis planejados"', () => {
    expect(pageContent).toContain('orçamentos de móveis planejados')
  })

  it('tem botão/link "Testar Grátis por 30 Dias"', () => {
    expect(pageContent).toContain('Testar Grátis por 30 Dias')
  })
})

describe('Landing Page — Seção Features', () => {
  it('contém exatamente 4 itens de features no array', () => {
    // Conta ocorrências de features pelo campo title no array
    const matches = pageContent.match(/title: '[^']+'/g) || []
    // O array features tem 4 entradas com campo title
    expect(matches.length).toBeGreaterThanOrEqual(4)
  })

  it('contém card "Orçamentos em Minutos"', () => {
    expect(pageContent).toContain('Orçamentos em Minutos')
  })

  it('contém card "Catálogo de Materiais"', () => {
    expect(pageContent).toContain('Catálogo de Materiais')
  })

  it('contém card "PDF Profissional"', () => {
    expect(pageContent).toContain('PDF Profissional')
  })

  it('contém card "Controle de Clientes"', () => {
    expect(pageContent).toContain('Controle de Clientes')
  })
})

describe('Landing Page — Seção Pricing', () => {
  it('exibe "R$ 49,90" como preço', () => {
    expect(pageContent).toContain('R$ 49,90')
  })

  it('menciona "30 dias" no trial', () => {
    expect(pageContent).toContain('30 dias')
  })

  it('indica trial sem cartão de crédito', () => {
    expect(pageContent).toContain('sem cartão')
  })

  it('lista itens incluídos no plano: orçamentos ilimitados', () => {
    expect(pageContent).toContain('Orçamentos ilimitados')
  })

  it('lista itens incluídos no plano: geração de PDF', () => {
    expect(pageContent).toContain('Geração de PDF')
  })

  it('tem CTA "Começar Grátis" linkando para /cadastro', () => {
    expect(pageContent).toContain('Começar Grátis')
    expect(pageContent).toContain('/cadastro')
  })
})

describe('Landing Page — CTA Final', () => {
  it('CTA final contém botão linkando para /cadastro', () => {
    // Verifica múltiplas referências ao /cadastro (hero + pricing + CTA final)
    const matches = (pageContent.match(/\/cadastro/g) || []).length
    expect(matches).toBeGreaterThanOrEqual(3)
  })

  it('CTA final tem headline de reforço', () => {
    expect(pageContent).toContain('Comece hoje')
  })
})

describe('Landing Page — Header', () => {
  it('header contém link para /login', () => {
    expect(pageContent).toContain('/login')
  })

  it('header contém link para /cadastro', () => {
    expect(pageContent).toContain('/cadastro')
  })

  it('header tem texto "Entrar" para link de login', () => {
    expect(pageContent).toContain('Entrar')
  })

  it('header exibe o nome da marca "Orça Fácil"', () => {
    expect(pageContent).toContain('Orça Fácil')
  })
})

describe('Landing Page — Footer', () => {
  it('tem elemento footer com copyright', () => {
    expect(pageContent).toContain('<footer')
    expect(pageContent).toContain('Orça Fácil')
  })
})

describe('Landing Page — Design System', () => {
  it('não usa cores hardcoded como blue-600', () => {
    expect(pageContent).not.toMatch(/\bblue-\d+\b/)
    expect(pageContent).not.toMatch(/\bgreen-\d+\b/)
    expect(pageContent).not.toMatch(/\bred-\d+\b/)
    expect(pageContent).not.toMatch(/\bgray-\d+\b/)
    expect(pageContent).not.toMatch(/\bzinc-\d+\b/)
  })

  it('usa tokens do design system (brand-primary, brand-support, etc.)', () => {
    expect(pageContent).toContain('brand-primary')
    expect(pageContent).toContain('brand-support')
    expect(pageContent).toContain('bg-bg-base')
  })

  it('importa componentes Button e Card da UI', () => {
    expect(pageContent).toContain("from '@/components/ui/button'")
    expect(pageContent).toContain("from '@/components/ui/card'")
  })

  it('usa Link do Next.js para navegação', () => {
    expect(pageContent).toContain("from 'next/link'")
  })
})

describe('Landing Page — Responsividade', () => {
  it('usa classes responsivas sm: e lg: nas seções principais', () => {
    expect(pageContent).toContain('sm:')
    expect(pageContent).toContain('lg:')
  })

  it('grid de features tem variante responsiva (1 coluna mobile, múltiplas colunas desktop)', () => {
    expect(pageContent).toContain('grid-cols-1')
    expect(pageContent).toContain('lg:grid-cols-4')
  })
})
