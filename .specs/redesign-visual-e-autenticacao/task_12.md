---
status: completed
title: PDF template: atualização de paleta de cores
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 12: PDF template: atualização de paleta de cores

## Overview

Atualiza o template HTML do PDF de orçamento em `lib/pdf/template.ts` para usar a nova paleta de cores do Orca Fácil, substituindo a paleta azul corporativa (`#2563eb`, `#1e40af`, `#eff6ff`) pelas cores terracota/petróleo. As fontes permanecem Arial/Helvetica (sem dependência de CDN no Puppeteer).

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "Technical Considerations — Known Risks" para o risco de cores residuais
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE substituir `#2563eb` (blue-600) por `#C2703A` (brand-primary/terracota) em todos os elementos de destaque (botões, headers de tabela, totais)
- DEVE substituir `#1e40af` (blue-900) por `#2D5D5A` (brand-support/petróleo) em elementos de header e títulos de seção
- DEVE substituir `#eff6ff` (blue-50) por `#FAF7F2` (bg-base/bege quente) em fundos de seção e totais
- DEVE substituir `#bfdbfe` (blue-200) por `#E5DDD3` (border) em bordas de tabela
- DEVE manter `font-family: Arial, Helvetica, sans-serif` em todos os elementos (sem troca de fonte)
- DEVE manter `color: #1a1a1a` e `color: #374151` para textos (ou atualizar para `#2B2621` se a legibilidade melhorar)
- DEVE garantir que nenhuma cor `#2563eb`, `#1e40af`, `#eff6ff` ou `#bfdbfe` permanece no template após a edição
</requirements>

## Subtasks

- [x] 12.1 Fazer grep de todas as cores azuis no arquivo (`#2563eb`, `#1e40af`, `#eff6ff`, `#bfdbfe`)
- [x] 12.2 Substituir cor primária (`#2563eb`) por `#C2703A` (terracota)
- [x] 12.3 Substituir cor de apoio (`#1e40af`) por `#2D5D5A` (petróleo)
- [x] 12.4 Substituir fundos azul claro (`#eff6ff`) por `#FAF7F2` (bege)
- [x] 12.5 Substituir bordas azul claro (`#bfdbfe`) por `#E5DDD3`
- [x] 12.6 Testar geração de PDF com as novas cores

## Implementation Details

Arquivo a modificar: `lib/pdf/template.ts`.

O arquivo gera HTML com CSS 100% inline — todas as cores estão como strings hexadecimais hardcoded. Fazer grep primeiro para ter a lista completa de ocorrências antes de editar. As cores do PDF não usam classes Tailwind, então a task_01 (tokens) não é usada diretamente aqui — a dependência de task_01 é conceitual (os valores dos tokens são a referência).

Após a edição, gerar um PDF de teste manualmente (via chamada à rota `/api/quotes/[id]/pdf`) e inspecionar o resultado para confirmar que o visual está correto.

Veja a seção "Technical Considerations" do TechSpec para o risco de cores residuais e a mitigação via grep.

### Relevant Files

- `lib/pdf/template.ts` — único arquivo a modificar

### Dependent Files

- `app/api/quotes/[id]/pdf/route.ts` — chama `generatePDF` que usa o template; não precisa modificar

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `lib/pdf/template.ts` atualizado com nova paleta, sem cores azuis residuais
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Saída do `generateTemplate()` não contém a string `#2563eb`
  - [ ] Saída do `generateTemplate()` não contém a string `#1e40af`
  - [ ] Saída do `generateTemplate()` não contém a string `#eff6ff`
  - [ ] Saída do `generateTemplate()` não contém a string `#bfdbfe`
  - [ ] Saída do `generateTemplate()` contém `#C2703A` (terracota) como cor primária
  - [ ] Saída do `generateTemplate()` contém `#2D5D5A` (petróleo) como cor de apoio
  - [ ] `font-family: Arial` ainda está presente no CSS do template
- Testes de integração:
  - [ ] PDF gerado via rota `/api/quotes/[id]/pdf` abre sem erros no Puppeteer com as novas cores
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- PDF gerado exibe paleta terracota/petróleo visualmente (sem azul)
- Fontes e layout do PDF permanecem idênticos ao original
- `lib/pdf/template.ts` sem nenhuma das 4 cores azuis após grep
