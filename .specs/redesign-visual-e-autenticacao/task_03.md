---
status: completed
title: Favicon SVG + PNG (16, 32, 180px)
type: frontend
complexity: low
dependencies: []
---

# Task 03: Favicon SVG + PNG (16, 32, 180px)

## Overview

Cria os arquivos de favicon da marca Orca Fácil e os referencia nos metadados do layout root. O ícone é composto por um esquadro de marceneiro (ângulo reto) com um check em terracota (`#C2703A`) sobre fundo transparente, conforme definido no PRD. Serve como identidade visual da marca em abas de navegador, favoritos e atalhos de tela inicial.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "System Architecture" para os arquivos necessários em /public
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `public/favicon.svg` com o ícone da marca (esquadro + check) usando as cores da paleta: petróleo `#2D5D5A` para o esquadro e terracota `#C2703A` para o check
- DEVE criar `public/favicon-16x16.png` (16×16px) a partir do SVG
- DEVE criar `public/favicon-32x32.png` (32×32px) a partir do SVG
- DEVE criar `public/apple-touch-icon.png` (180×180px) a partir do SVG
- DEVE referenciar os arquivos via `metadata.icons` em `app/layout.tsx` (ou via arquivo `app/icon.svg` conforme convenção Next.js App Router)
- DEVE garantir que o ícone seja legível em 16×16 — sem detalhes excessivos que virem mancha
- DEVERIA usar fundo transparente no SVG para adaptação a temas escuros de navegador
</requirements>

## Subtasks

- [x] 3.1 Criar `public/favicon.svg` com o ícone esquadro + check nas cores da marca
- [x] 3.2 Exportar `public/favicon-16x16.png` e `public/favicon-32x32.png` a partir do SVG
- [x] 3.3 Exportar `public/apple-touch-icon.png` (180×180) com fundo branco/bege `#FAF7F2`
- [x] 3.4 Referenciar os arquivos em `metadata.icons` no `app/layout.tsx`
- [x] 3.5 Verificar legibilidade do ícone em tamanho 16×16 (elementos distintos visíveis)

## Implementation Details

Arquivos a criar em `public/`: `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`.

O Next.js App Router suporta convenção de arquivo: colocar `icon.svg` em `app/` gera automaticamente os metadados. Alternativamente, definir `metadata.icons` em `app/layout.tsx` permite referenciar os arquivos de `/public` explicitamente.

O SVG deve ser simples o suficiente para ser legível em 16×16: esquadro geométrico (duas linhas em ângulo reto, stroke) com um check (✓) no canto interno. Detalhes decorativos devem ser evitados nesta escala.

Veja a seção "System Architecture" do TechSpec para os caminhos dos arquivos esperados.

### Relevant Files

- `public/` — diretório de destino para os arquivos estáticos
- `app/layout.tsx` — onde os ícones são referenciados via `metadata.icons`

### Dependent Files

- `app/(marketing)/page.tsx` (task_13) — a landing page se beneficia do favicon para branding na aba

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `public/favicon.svg` com o ícone da marca
- `public/favicon-16x16.png`, `public/favicon-32x32.png`, `public/apple-touch-icon.png`
- Metadados de ícone configurados em `app/layout.tsx`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Verificar que `public/favicon.svg` existe e contém elementos SVG válidos (path/rect)
  - [x] Verificar que `public/favicon-16x16.png`, `public/favicon-32x32.png` e `public/apple-touch-icon.png` existem
  - [x] Verificar que `app/layout.tsx` referencia pelo menos um dos arquivos de ícone via `metadata.icons` ou convenção App Router
  - [x] Verificar que o SVG usa as cores `#C2703A` e `#2D5D5A` (grep no arquivo)
- Testes de integração:
  - [ ] `next build` sem erros relacionados aos arquivos de ícone
  - [ ] Aba do navegador exibe o favicon ao acessar a aplicação em desenvolvimento
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Favicon visível na aba do navegador (Chrome e Safari)
- Apple Touch Icon exibido ao adicionar o site à tela inicial de um iPhone
- Ícone legível em tamanho 16×16 sem elementos confusos
