---
status: completed
title: "UI de upload de fotos no wizard + PDF com fotos"
type: frontend
complexity: medium
dependencies:
  - task_07
  - task_08
---

# Task 09: UI de upload de fotos no wizard + PDF com fotos

## Overview

Adiciona a interface de upload de fotos de referência ao passo de ambientes do wizard e estende o template de PDF para incluir essas fotos no layout de orçamento detalhado. Depende da calculadora de chapas (task_07) e dos endpoints de backend (task_08) para funcionar.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar seção de upload de fotos ao componente de ambiente em `components/wizard/step-rooms.tsx` (ou em componente filho `room-photo-upload.tsx`).
- A UI DEVE permitir upload de até 3 fotos por ambiente com preview imediato após upload.
- DEVE exibir indicador de carregamento durante upload e mensagem de erro em caso de falha (tipo/tamanho inválido, limite atingido).
- DEVE permitir exclusão de foto com confirmação (chamada DELETE ao endpoint da task_08).
- DEVE funcionar em dispositivos móveis (botão de upload com acesso à câmera e galeria via `<input type="file" accept="image/*" capture="environment">`).
- DEVE estender `lib/pdf/template.ts` para incluir fotos por ambiente no modo detalhado do PDF.
- As fotos no PDF DEVEM aparecer após a lista de peças do ambiente, em grid de até 3 colunas.
- As fotos DEVEM usar URLs assinadas retornadas pelos endpoints (não URLs públicas).
- A seção de fotos no PDF DEVE aparecer somente quando o ambiente tiver ao menos uma foto.
</requirements>

## Subtasks

- [x] 9.1 Adicionar UI de upload de fotos ao componente de ambiente (preview, carregamento, erro, exclusão)
- [x] 9.2 Integrar chamadas POST e DELETE aos endpoints da task_08
- [x] 9.3 Implementar input de arquivo com suporte a câmera em dispositivos móveis
- [x] 9.4 Estender `lib/pdf/template.ts` para renderizar fotos por ambiente no PDF
- [x] 9.5 Adicionar testes unitários para o componente de upload e a extensão do template PDF

## Implementation Details

Veja as seções "Component Design — Upload de Fotos" e "PDF Template Extension" do TechSpec para o design exato da UI e a estrutura do HTML do PDF.

O componente de upload lida com o estado local das fotos (array de `{ id, image_url, position }`). Ao montar, chama `GET /api/rooms/[roomId]/photos` para carregar fotos existentes. Ao selecionar arquivo, faz POST com `FormData`. Ao clicar em remover, chama DELETE.

O `lib/pdf/template.ts` já tem interfaces `PdfRoom` — verificar se é necessário adicionar `photos?: string[]` à interface. As fotos são convertidas para base64 ou referenciadas por URL assinada no HTML do PDF gerado pelo Puppeteer.

### Relevant Files

- `components/wizard/step-rooms.tsx` — arquivo principal a modificar
- `components/wizard/room-item-form.tsx` — componente de peça individual (referência de padrão)
- `lib/pdf/template.ts` — template HTML do PDF a estender
- `lib/pdf/generate.ts` — `generatePdfFromHtml()` via Puppeteer
- `app/api/rooms/[roomId]/photos/route.ts` (task_08) — endpoint de upload

### Dependent Files

- `lib/pdf/template.ts` — DEVE ser estendido com suporte a fotos
- `components/wizard/step-review.tsx` — pode precisar de ajuste se exibir preview de fotos no resumo

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `components/wizard/step-rooms.tsx` modificado com UI de upload de fotos
- `lib/pdf/template.ts` estendido com fotos de ambiente
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Componente de upload renderiza botão "Adicionar foto" quando ambiente tem 0 fotos
  - [ ] Componente de upload não renderiza botão "Adicionar foto" quando ambiente já tem 3 fotos
  - [ ] Após upload bem-sucedido, foto aparece na lista com botão de exclusão
  - [ ] Ao clicar em excluir, foto é removida da lista e DELETE é chamado
  - [ ] Erro de tipo de arquivo inválido exibe mensagem de erro no componente
  - [ ] `lib/pdf/template.ts` inclui tag `<img>` com URL assinada quando `room.photos` tem itens
  - [ ] `lib/pdf/template.ts` não inclui seção de fotos quando `room.photos` está vazio
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Upload de fotos funciona via câmera e galeria em dispositivos móveis
- Fotos aparecem no PDF detalhado do orçamento
- Limite de 3 fotos por ambiente é respeitado na UI
