---
status: pending
title: Perfil da marcenaria + upload de logo
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
---

# Task 05: Perfil da marcenaria + upload de logo

## Overview

Implementa a página de configurações onde o marceneiro cadastra os dados da sua marcenaria (nome, cidade, telefone, chave Pix) e faz upload da logo que aparecerá no cabeçalho do PDF. O perfil é opcional no onboarding — o marceneiro pode criar o primeiro orçamento sem preencher nada aqui.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar Route Handler `GET /api/profile` que retorna o perfil do usuário autenticado
- DEVE criar Route Handler `PATCH /api/profile` que atualiza campos parciais de `profiles` (business_name, city, phone, pix_key, bank_info, quote_validity_days, profit_margin_pct)
- DEVE criar Route Handler `POST /api/profile/logo` que recebe multipart/form-data com a imagem, faz upload para o bucket `logos` no path `{userId}/logo.{ext}` e atualiza `profiles.logo_url`
- DEVE validar tipo de arquivo (apenas image/jpeg, image/png, image/webp) e tamanho máximo de 5MB no upload de logo
- DEVE retornar URL assinada (signed URL) da logo com expiração de 1 hora para exibição na UI de configurações
- A página DEVE ser mobile-first com campos grandes e touch-friendly
- O campo de logo DEVE mostrar preview da imagem após upload com opção de substituir
- DEVERIA configurar `profit_margin_pct` e `quote_validity_days` com os valores padrão do perfil (usados como defaults ao criar novo orçamento)
</requirements>

## Subtasks

- [ ] 5.1 Criar página `/configuracoes` com formulário de perfil
- [ ] 5.2 Implementar Route Handler `GET /api/profile`
- [ ] 5.3 Implementar Route Handler `PATCH /api/profile` com validação de campos
- [ ] 5.4 Implementar Route Handler `POST /api/profile/logo` com validação de tipo/tamanho e upload para Storage
- [ ] 5.5 Adicionar preview de logo na UI com opção de substituir
- [ ] 5.6 Adicionar campos de configurações padrão (prazo de validade e margem de lucro padrão)

## Implementation Details

Veja as seções "API Endpoints → Perfil" e "Integration Points → Supabase → Storage" do TechSpec para o fluxo de upload e geração de URLs assinadas.

O upload de logo usa `service_role` key no Route Handler (não o client anon) para contornar RLS no Storage e salvar no path controlado pelo servidor:

```
supabase.storage.from('logos').upload(`${userId}/logo.${ext}`, buffer, { upsert: true })
```

### Relevant Files

- `app/(app)/configuracoes/page.tsx` — página de configurações do perfil
- `app/api/profile/route.ts` — GET e PATCH do perfil
- `app/api/profile/logo/route.ts` — POST de upload de logo
- `lib/supabase/server.ts` — client com service_role para uploads

### Dependent Files

- `app/api/quotes/[id]/pdf/route.ts` (task_10) — busca `logo_url` do perfil para incluir no PDF
- `components/trial-banner.tsx` (task_04) — pode exibir nome da marcenaria

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- Página `/configuracoes` funcional em mobile
- Upload de logo com preview e validação (tipo + tamanho)
- Perfil atualizado refletido imediatamente na UI
- Route Handlers com validação e respostas tipadas
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para upload e persistência **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `PATCH /api/profile` com body vazio retorna 200 sem alterar campos (PATCH parcial)
  - [ ] `PATCH /api/profile` com `profit_margin_pct: 150` retorna 400 (margem inválida)
  - [ ] `POST /api/profile/logo` com arquivo `application/pdf` retorna 400 (tipo inválido)
  - [ ] `POST /api/profile/logo` com arquivo de 6MB retorna 413 (tamanho excedido)
  - [ ] `POST /api/profile/logo` com JPEG válido retorna 200 com `logo_url` preenchida
- Testes de integração:
  - [ ] `PATCH /api/profile` atualiza `business_name` e o valor persiste em `GET /api/profile`
  - [ ] Logo uploaded com sucesso aparece no preview da página de configurações
  - [ ] Usuário B não consegue `PATCH /api/profile` com `id` do usuário A (RLS bloqueia)

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Upload de logo < 5MB conclui em < 3s em conexão 4G
- Preview da logo exibido imediatamente após upload sem reload da página
- Dados do perfil persistem após reload
