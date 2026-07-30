---
status: completed
title: "Modelo de mensagem WhatsApp editável no wizard"
type: frontend
complexity: medium
dependencies:
  - task_04
---

# Task 10: Modelo de mensagem WhatsApp editável no wizard

## Overview

Substitui o botão de compartilhamento WhatsApp fixo do passo de envio do wizard por um campo de mensagem pré-preenchida e editável. O modelo inclui nome do cliente, número do orçamento e link de aprovação. O marceneiro pode personalizar e salvar seu modelo padrão no perfil.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE modificar `components/wizard/step-send.tsx` para exibir a mensagem WhatsApp como textarea editável.
- A mensagem DEVE ser pré-preenchida com o template do perfil (`whatsapp_message_template`) ou com um template padrão quando o campo estiver nulo.
- O template padrão DEVE incluir as variáveis `{{nome_cliente}}`, `{{numero_orcamento}}` e `{{link_aprovacao}}`.
- As variáveis DEVEM ser interpoladas com os dados reais do orçamento antes de exibir na textarea.
- DEVE exibir botão "Salvar como meu modelo" que persiste o template no perfil via `PATCH /api/profile`.
- O botão "Enviar pelo WhatsApp" DEVE usar a mensagem editada (não o template) como texto do link `wa.me/...`.
- DEVE exibir o `approval_link` retornado pelo PATCH de status='sent' (task_04) na mensagem.
- O link WhatsApp DEVE usar `encodeURIComponent(mensagemEditada)` na URL.
- DEVE mostrar confirmação visual ("Modelo salvo!") após salvar o template com sucesso.
</requirements>

## Subtasks

- [x] 10.1 Modificar `step-send.tsx` para carregar o template do perfil e interpolar variáveis
- [x] 10.2 Adicionar textarea editável com a mensagem interpolada
- [x] 10.3 Atualizar o link `wa.me/...` para usar a mensagem editada pelo marceneiro
- [x] 10.4 Implementar botão "Salvar como meu modelo" com chamada PATCH ao endpoint de perfil
- [x] 10.5 Adicionar testes unitários para interpolação de variáveis e fluxo de salvamento

## Implementation Details

Veja a seção "Component Design — WhatsApp Template" do TechSpec para o fluxo exato de interpolação e salvamento.

A interpolação substitui `{{nome_cliente}}` pelo `customer_name` do orçamento, `{{numero_orcamento}}` pelo `quote_number` e `{{link_aprovacao}}` pelo `approval_link` retornado no PATCH de status='sent'.

O `PATCH /api/profile` já existe — basta adicionar `whatsapp_message_template` como campo aceito pelo handler de perfil (verificar se já aceita ou se precisa de extensão).

A textarea usa estado local React; o conteúdo editado é usado apenas para gerar o link de envio e para salvar o modelo — não persiste no orçamento.

### Relevant Files

- `components/wizard/step-send.tsx` — arquivo principal a modificar (11KB)
- `app/api/profile/route.ts` — endpoint PATCH de perfil (verificar se aceita `whatsapp_message_template`)
- `app/api/quotes/[id]/route.ts` — onde o `approval_link` é retornado pelo PATCH de status='sent'

### Dependent Files

- `app/api/profile/route.ts` — PODE precisar de extensão para aceitar `whatsapp_message_template`

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `components/wizard/step-send.tsx` modificado com textarea e salvamento de template
- `app/api/profile/route.ts` atualizado para aceitar `whatsapp_message_template` (se necessário)
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Textarea exibe template padrão quando `whatsapp_message_template` do perfil é nulo
  - [x] Textarea exibe template do perfil quando `whatsapp_message_template` está preenchido
  - [x] `{{nome_cliente}}` é substituído pelo nome real do cliente na textarea
  - [x] `{{numero_orcamento}}` é substituído pelo número real do orçamento
  - [x] `{{link_aprovacao}}` é substituído pelo `approval_link` retornado pelo PATCH
  - [x] Link `wa.me/...` inclui `encodeURIComponent` da mensagem editada
  - [x] Clicar em "Salvar como meu modelo" chama `PATCH /api/profile` com o texto do template
  - [x] Confirmação "Modelo salvo!" é exibida após resposta 200 do PATCH
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Mensagem WhatsApp pré-preenchida com dados reais do orçamento
- Marceneiro pode editar e salvar seu modelo
- Link WhatsApp usa a mensagem editada
