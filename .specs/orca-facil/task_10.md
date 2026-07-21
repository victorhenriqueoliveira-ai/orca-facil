---
status: completed
title: Geração de PDF + compartilhamento WhatsApp (Etapa 4)
type: backend
complexity: high
dependencies:
  - task_05
  - task_09
---

# Task 10: Geração de PDF + compartilhamento WhatsApp (Etapa 4)

## Overview

Implementa a etapa 4 do wizard — o coração do produto: o Route Handler que busca todos os dados do orçamento, renderiza um HTML completo, gera o PDF via Puppeteer + @sparticuz/chromium, salva no Supabase Storage e retorna uma URL assinada de 7 dias. Após o sucesso, o status do orçamento muda para `sent` e o botão "Enviar pelo WhatsApp" abre o deep link com a URL no texto.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar Route Handler `POST /api/quotes/[id]/pdf` com body `{ mode: 'summary'|'detailed', version_ids: string[] }`
- DEVE usar `export const runtime = 'nodejs'` e `export const maxDuration = 60` no Route Handler
- DEVE detectar ambiente: em desenvolvimento usar `puppeteer` padrão; em produção usar `@sparticuz/chromium` com `executablePath` dinâmico
- DEVE buscar do banco: dados do orçamento, versões selecionadas, rooms, items, dados do cliente e perfil da marcenaria (incluindo `logo_url`)
- DEVE gerar URL assinada da logo (bucket `logos`) para incluir no HTML do PDF — o Puppeteer precisa de URL acessível, não caminho interno
- DEVE renderizar HTML com CSS inline ou `<style>` embutido (sem dependência de CDN externo — Puppeteer em produção não tem acesso à internet)
- DEVE gerar PDF A4 com `page.pdf({ format: 'A4', printBackground: true })`
- DEVE fazer upload do PDF gerado para bucket `pdfs` no path `{userId}/{quoteId}/{timestamp}.pdf`
- DEVE criar registro em `quote_pdfs` com `storage_path`, `mode` e `version_ids`
- DEVE retornar `{ signed_url }` com expiração de 7 dias (604800 segundos)
- DEVE atualizar `quotes.status` para `'sent'` após geração bem-sucedida
- DEVE exibir estado de loading "Gerando PDF..." na etapa 4 durante a geração
- O botão "Enviar pelo WhatsApp" DEVE abrir `https://wa.me/?text=Segue+o+orçamento+da+[Nome]%3A+[signed_url]`
- DEVERIA usar Web Share API (`navigator.share`) como alternativa quando disponível
</requirements>

## Subtasks

- [x] 10.1 Criar template HTML do PDF em `lib/pdf/template.ts` (modo resumido e detalhado)
- [x] 10.2 Criar função de geração PDF em `lib/pdf/generate.ts` (Puppeteer + Chromium)
- [x] 10.3 Criar Route Handler `POST /api/quotes/[id]/pdf` com fetch de dados, geração e upload
- [x] 10.4 Implementar upload para bucket `pdfs` e criação de registro em `quote_pdfs`
- [x] 10.5 Implementar etapa 4 do wizard com loading state e botão de WhatsApp
- [x] 10.6 Atualizar `quotes.status` para `'sent'` após geração bem-sucedida

## Implementation Details

Veja as seções "API Endpoints → Geração de PDF", "Integration Points → WhatsApp", "Technical Considerations → Key Decisions" e "Known Risks" do TechSpec para todos os detalhes desta implementação.

O template HTML deve incluir CSS inline (não classes Tailwind — o Puppeteer não processa o CSS do Next.js). Usar variáveis CSS ou objetos de estilo inline. O layout do PDF:
- Modo resumido: cabeçalho (logo + dados) → dados do cliente → lista de ambientes com total por ambiente → total global → rodapé (Pix + observações)
- Modo detalhado: mesma estrutura, com expansão de cada ambiente listando items individuais

Detecção de ambiente para Chromium:
```typescript
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: process.env.NODE_ENV === 'production'
    ? await chromium.executablePath()
    : '/usr/bin/google-chrome', // ou caminho local do Chrome
  headless: chromium.headless,
})
```

### Relevant Files

- `lib/pdf/template.ts` — função que recebe dados do orçamento e retorna string HTML
- `lib/pdf/generate.ts` — função que recebe HTML e retorna Buffer do PDF
- `app/api/quotes/[id]/pdf/route.ts` — Route Handler de geração
- `components/wizard/step-send.tsx` — etapa 4 com loading e botão WhatsApp

### Dependent Files

- `app/(app)/orcamentos/[id]/page.tsx` (task_11) — exibe botão de download do PDF gerado via `quote_pdfs`
- `app/api/quotes/[id]/versions/route.ts` (task_12) — versões múltiplas afetam quais `version_ids` são passados ao PDF

### Related ADRs

- [ADR-002: Puppeteer + @sparticuz/chromium para Geração de PDF](adrs/adr-002.md) — justifica a escolha e documenta a configuração de `maxDuration` e `serverExternalPackages`

## Deliverables

- `lib/pdf/template.ts` com HTML para modos resumido e detalhado
- `lib/pdf/generate.ts` com integração Puppeteer + Chromium
- Route Handler `POST /api/quotes/[id]/pdf` funcional
- PDF gerado com logo, dados do cliente e itens corretos
- Upload para Supabase Storage e registro em `quote_pdfs`
- Botão WhatsApp abrindo deep link corretamente em mobile
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração end-to-end de geração **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `lib/pdf/template.ts` com dados de orçamento contendo 2 ambientes retorna HTML com 2 seções de ambiente
  - [x] Template no modo resumido não inclui tabela de itens individuais
  - [x] Template no modo detalhado inclui todos os itens com `unit_price` e `quantity`
  - [x] Template com `logo_url = null` renderiza sem tag `<img>` (sem erro)
  - [x] Template exibe total formatado como "R$ 1.500,00" (vírgula decimal, ponto milhar)
  - [x] `POST /api/quotes/[id]/pdf` com `version_ids` de outro orçamento retorna 403
- Testes de integração:
  - [x] `POST /api/quotes/[id]/pdf` retorna `{ signed_url }` com URL válida do Supabase Storage
  - [x] `quote_pdfs` contém registro com `storage_path` correto após geração
  - [x] `quotes.status` é `'sent'` após geração bem-sucedida
  - [x] PDF gerado é acessível via `signed_url` por 7 dias (sem autenticação)

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- PDF gerado em < 10s em produção (Vercel, cold start incluído)
- PDF abre corretamente no WhatsApp quando compartilhado via deep link
- Logo aparece no cabeçalho do PDF quando configurada no perfil
- Modo resumido e detalhado produzem layouts distintos e corretos
