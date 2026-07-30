---
status: completed
title: Landing page: hero, features, pricing, CTA
type: frontend
complexity: high
dependencies:
  - task_01
  - task_02
  - task_03
  - task_04
---

# Task 13: Landing page: hero, features, pricing, CTA

## Overview

Cria a landing page pública do Orca Fácil em `app/page.tsx`, substituindo o placeholder padrão do Next.js. A página apresenta o produto para marceneiros autônomos com quatro seções: hero com CTA de trial, features/benefícios, pricing (plano único R$ 49,90/mês) e CTA final. É a principal superfície de aquisição de novos usuários.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "System Architecture" para a estrutura de arquivo e seção "Integration Points" para o carregamento de fontes
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `app/page.tsx` como Server Component com as 4 seções: hero, features, pricing e CTA final
- DEVE implementar a seção hero com: headline ("Crie orçamentos de móveis planejados em minutos, direto do celular"), subheadline de credibilidade e `<Button>` com CTA "Testar Grátis por 30 Dias" linkando para `/cadastro`
- DEVE implementar a seção features com 4 cards (usar `<Card>` da task_04) apresentando os benefícios: criar orçamentos em minutos, catálogo de materiais, PDF profissional, controle de clientes
- DEVE implementar a seção pricing com um card único mostrando R$ 49,90/mês, trial de 30 dias sem cartão e lista de itens incluídos; CTA "Começar Grátis" → `/cadastro`
- DEVE implementar CTA final com headline de reforço e botão de cadastro
- DEVE exportar `metadata` com title, description, og:title, og:description e og:url específicos da landing (ver PRD seção "Features Principais — Metadados")
- DEVE ser responsiva: uma coluna em mobile, grade em desktop (features em 2 ou 4 colunas)
- DEVE ter `<header>` com logo e links "Entrar" (`/login`) e "Começar Grátis" (`/cadastro`)
- DEVE garantir que o LCP (maior elemento visível) carrega sem layout shift — imagens e fontes com `priority` quando necessário
- DEVERIA incluir `<footer>` simples com copyright
</requirements>

## Subtasks

- [x] 13.1 Criar `app/page.tsx` com estrutura de seções e metadata exportado
- [x] 13.2 Implementar `<header>` com logo, links de login e CTA
- [x] 13.3 Implementar seção hero com headline, subheadline e CTA
- [x] 13.4 Implementar seção features com 4 cards de benefícios
- [x] 13.5 Implementar seção pricing com card único e lista de itens incluídos
- [x] 13.6 Implementar seção CTA final e `<footer>`
- [x] 13.7 Verificar responsividade em 375px, 768px e 1440px

## Implementation Details

Arquivo a criar/substituir: `app/page.tsx`.

A página está na raiz do `app/` e herda o `app/layout.tsx` (Manrope, metadata base da task_02). Não usa o `app/(app)/layout.tsx` — é pública e não requer autenticação.

Usar os componentes `<Button>` e `<Card>` da task_04 para manter consistência com o restante do produto. Favicons da task_03 aparecem automaticamente via `metadata.icons` configurado na task_02.

O metadata desta página deve sobrescrever o title base com `{ title: { absolute: 'Orça Fácil — Orçamentos de Móveis Planejados para Marceneiros' } }` para garantir que o title da landing não herda o template do root layout.

Para as OG tags, `og:image` pode apontar para uma imagem placeholder em `/public/og-image.png` por enquanto (questão em aberto do PRD — pode ser gerada com `next/og` em release futura).

### Relevant Files

- `app/page.tsx` — arquivo a substituir
- `app/layout.tsx` (task_02) — layout herdado (Manrope, metadata base)
- `public/favicon.svg` (task_03) — referenciado via metadata
- `components/ui/button.tsx` (task_04) — usado nos CTAs
- `components/ui/card.tsx` (task_04) — usado nos cards de features e pricing

### Dependent Files

- Nenhum arquivo interno depende da landing page

### Related ADRs

- [ADR-001: Estratégia de Entrega — Uma Release, Três Frentes em Paralelo](../adrs/adr-001.md) — Landing page é a terceira frente da release coesa

## Deliverables

- `app/page.tsx` completo com as 4 seções e metadata
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para a página pública **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Página renderiza as 4 seções: hero, features, pricing, CTA final
  - [x] Hero contém o texto "Testar Grátis" e link para `/cadastro`
  - [x] Seção features contém exatamente 4 cards de benefícios
  - [x] Seção pricing exibe "R$ 49,90" e "30 dias" sem cartão
  - [x] CTA final contém botão linkando para `/cadastro`
  - [x] `metadata.title` contém "Orça Fácil" e não a string padrão do Next.js
  - [x] `metadata.description` é não-vazia e específica ao produto
  - [x] Header contém links para `/login` e `/cadastro`
- Testes de integração:
  - [x] Página `/` carrega com status 200 sem erros de console
  - [x] Link "Testar Grátis" navega para `/cadastro` (página de cadastro da task_05)
  - [x] Link "Entrar" navega para `/login`
  - [x] Página não exibe conteúdo autenticado (sem sidebar, sem trial banner)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Landing page acessível publicamente em `/` sem necessidade de login
- Valor do produto compreensível em menos de 10 segundos (validar manualmente com leitura)
- Responsiva em 375px, 768px e 1440px sem overflow ou layout quebrado
- LCP ≤ 2,5s em conexão simulada 4G (verificar com Lighthouse)
- Nenhuma classe `blue-600` ou cor hardcoded — apenas tokens do design system
