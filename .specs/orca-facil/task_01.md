---
status: pending
title: Setup do projeto Next.js + Tailwind + Supabase
type: infra
complexity: low
dependencies: []
---

# Task 01: Setup do projeto Next.js + Tailwind + Supabase

## Overview

Inicializa o repositório com a stack definida no TechSpec: Next.js 14+ (App Router), TypeScript estrito, Tailwind CSS e clientes Supabase configurados para SSR. Estabelece a estrutura de pastas, variáveis de ambiente e configuração do Puppeteer para a Vercel — base obrigatória para todas as demais tarefas.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE usar `create-next-app` com flags `--typescript --tailwind --app --src-dir no --import-alias "@/*"`
- DEVE instalar: `@supabase/ssr`, `@supabase/supabase-js`, `puppeteer-core`, `@sparticuz/chromium`
- DEVE configurar `next.config.ts` com `serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core']`
- DEVE criar `lib/supabase/client.ts` (browser client com `createBrowserClient`) e `lib/supabase/server.ts` (server client com `createServerClient` usando cookies do Next.js)
- DEVE criar `.env.local` com as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- DEVE criar `.env.example` com as mesmas variáveis sem valores
- DEVE garantir que `.env.local` está no `.gitignore`
- DEVE instalar `vitest` e `@vitejs/plugin-react` como devDependencies para o framework de testes
- DEVERIA adicionar scripts no `package.json`: `"test": "vitest"`, `"test:ui": "vitest --ui"`
</requirements>

## Subtasks

- [ ] 1.1 Inicializar projeto Next.js com TypeScript, Tailwind e App Router
- [ ] 1.2 Instalar dependências de produção (Supabase, Puppeteer, Chromium)
- [ ] 1.3 Instalar dependências de desenvolvimento (Vitest)
- [ ] 1.4 Configurar `next.config.ts` com `serverExternalPackages`
- [ ] 1.5 Criar clientes Supabase para browser e servidor em `lib/supabase/`
- [ ] 1.6 Criar arquivos de variáveis de ambiente (`.env.local` e `.env.example`)
- [ ] 1.7 Validar que `next dev` inicia sem erros e a página inicial renderiza

## Implementation Details

Veja a seção "System Architecture" e "Technical Dependencies" do TechSpec para a lista completa de pacotes e configurações necessárias.

Estrutura mínima de diretórios após esta tarefa:
```
app/
lib/
  supabase/
    client.ts
    server.ts
.env.local
.env.example
next.config.ts
package.json
tailwind.config.ts
vitest.config.ts
```

### Relevant Files

- `next.config.ts` — configuração de `serverExternalPackages` para Chromium
- `lib/supabase/client.ts` — cliente Supabase para componentes client-side
- `lib/supabase/server.ts` — cliente Supabase para Route Handlers e Server Components
- `package.json` — scripts de test e dependências
- `vitest.config.ts` — configuração do Vitest com plugin React

### Dependent Files

- Todos os outros arquivos do projeto dependem desta base configurada

### Related ADRs

- [ADR-002: Puppeteer + @sparticuz/chromium para Geração de PDF](adrs/adr-002.md) — define os pacotes necessários e a configuração de `serverExternalPackages`

## Deliverables

- Projeto Next.js rodando em `localhost:3000` sem erros
- Clientes Supabase criados e tipados em `lib/supabase/`
- `.env.example` commitado com todas as variáveis documentadas
- Vitest configurado e executando com `npm test`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `lib/supabase/client.ts` exporta uma função que retorna um client Supabase válido (não nulo)
  - [ ] `lib/supabase/server.ts` exporta uma função que aceita `cookieStore` e retorna um client válido
  - [ ] `next.config.ts` contém `serverExternalPackages` com `@sparticuz/chromium` e `puppeteer-core`
- Testes de integração:
  - [ ] `npm run build` conclui sem erros de TypeScript ou de build
  - [ ] `npm test` executa sem falhas na configuração inicial

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `next dev` e `next build` executam sem erros
- Clientes Supabase corretamente tipados (sem `any` explícito)
- `.env.local` ausente do histórico git
