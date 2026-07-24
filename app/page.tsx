import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'

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

const features = [
  {
    icon: '⚡',
    title: 'Orçamentos em Minutos',
    description: 'Crie e envie orçamentos profissionais diretamente do celular, sem complicação.',
  },
  {
    icon: '📦',
    title: 'Catálogo de Materiais',
    description: 'Organize seus materiais e preços em um único lugar, sempre atualizado.',
  },
  {
    icon: '📄',
    title: 'PDF Profissional',
    description: 'Gere PDFs prontos para enviar ao cliente com a sua marca.',
  },
  {
    icon: '👥',
    title: 'Controle de Clientes',
    description: 'Histórico completo de orçamentos por cliente, sempre à mão.',
  },
]

const planItems = [
  'Orçamentos ilimitados',
  'Catálogo de materiais',
  'Geração de PDF',
  'Controle de clientes',
  'Suporte por email',
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-full bg-bg-base font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg-base/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/">
              <img src="/orca_facil.png" alt="Orça Fácil" className="h-[120px] sm:h-[160px] w-auto" />
            </Link>
            <nav className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-text-base hover:text-brand-support transition-colors"
              >
                Entrar
              </Link>
              <Link href="/cadastro">
                <Button size="sm" variant="primary">
                  Começar Grátis
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-brand-support">
              Crie orçamentos de móveis planejados em minutos, direto do celular
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-text-base/70 max-w-2xl mx-auto">
              Use Orça Fácil para fechar mais negócios com menos esforço. Sem planilhas, sem complicação.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cadastro">
                <Button size="lg" variant="primary">
                  Testar Grátis por 30 Dias
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="ghost">
                  Já tenho conta
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-text-base/50">
              Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>
        </section>

        {/* Features */}
        <section
          className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white"
          aria-label="Benefícios"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-support">
                Tudo que você precisa para fechar mais orçamentos
              </h2>
              <p className="mt-4 text-text-base/70">
                Ferramentas simples que funcionam no seu dia a dia de marceneiro.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardBody className="p-6">
                    <div className="text-3xl mb-4" aria-hidden="true">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-brand-support mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-text-base/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8"
          aria-label="Preços"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-support">
                Um plano simples, sem surpresas
              </h2>
              <p className="mt-4 text-text-base/70">
                Comece grátis. Assine apenas quando ver o valor.
              </p>
            </div>
            <div className="mx-auto max-w-sm">
              <Card className="border-2 border-brand-primary shadow-lg">
                <CardBody className="p-8 text-center">
                  <div className="text-sm font-medium text-brand-primary uppercase tracking-wide mb-2">
                    Plano Profissional
                  </div>
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className="text-4xl font-bold text-brand-support">R$ 49,90</span>
                    <span className="text-text-base/60">/mês</span>
                  </div>
                  <p className="text-sm text-brand-primary font-medium mb-8">
                    30 dias grátis, sem cartão de crédito
                  </p>
                  <ul className="text-left space-y-3 mb-8">
                    {planItems.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-text-base">
                        <span className="text-brand-primary font-bold" aria-hidden="true">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/cadastro" className="block">
                    <Button size="lg" variant="primary" className="w-full">
                      Começar Grátis
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section
          className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-brand-support"
          aria-label="Chamada para ação final"
        >
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Pare de perder tempo com planilhas. Comece hoje.
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Junte-se a centenas de marceneiros que já profissionalizaram seus orçamentos com o Orça Fácil.
            </p>
            <Link href="/cadastro">
              <Button
                size="lg"
                className="bg-brand-primary text-white hover:opacity-90 active:opacity-80 px-8"
              >
                Testar Grátis por 30 Dias
              </Button>
            </Link>
            <p className="mt-4 text-white/60 text-sm">
              Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8 bg-bg-base">
        <div className="mx-auto max-w-6xl text-center text-sm text-text-base/50">
          © {new Date().getFullYear()} Orça Fácil. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}
