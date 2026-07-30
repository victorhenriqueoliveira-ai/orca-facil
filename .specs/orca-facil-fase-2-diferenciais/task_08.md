---
status: completed
title: "Routes de fotos de ambiente (upload e exclusão)"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 08: Routes de fotos de ambiente (upload e exclusão)

## Overview

Cria os endpoints de backend para upload e exclusão de fotos de ambiente de orçamento. As fotos são armazenadas no bucket `quote-photos` (Supabase Storage, privado) e os metadados na tabela `quote_room_photos` criada na migration 014. Esses endpoints são consumidos pela UI de upload da task_09.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `app/api/rooms/[roomId]/photos/route.ts` com handlers `POST` (upload) e `GET` (listar).
- DEVE criar `app/api/rooms/[roomId]/photos/[photoId]/route.ts` com handler `DELETE` (exclusão).
- O `POST` DEVE: validar tipo de arquivo (jpeg/png/webp), validar tamanho máximo (5MB), fazer upload no path `${userId}/${roomId}/${photoId}.${ext}` no bucket `quote-photos`, inserir registro em `quote_room_photos` e retornar a URL assinada.
- O `GET` DEVE retornar lista de fotos do ambiente com URLs assinadas (validade de 1h).
- O `DELETE` DEVE: remover o arquivo do Storage e deletar o registro em `quote_room_photos`.
- DEVE verificar que `roomId` pertence ao usuário autenticado (via join quote_rooms → quote_versions → quotes → user_id) antes de qualquer operação.
- DEVE limitar a 3 fotos por ambiente (retornar 422 se tentar adicionar além do limite).
- Seguir o padrão existente de `app/api/catalog/[id]/image/route.ts` para upload de imagem.
</requirements>

## Subtasks

- [x] 8.1 Criar `app/api/rooms/[roomId]/photos/route.ts` com POST (upload + insert) e GET (listar com signed URLs)
- [x] 8.2 Criar `app/api/rooms/[roomId]/photos/[photoId]/route.ts` com DELETE (remover storage + registro)
- [x] 8.3 Implementar verificação de ownership do room via join encadeado
- [x] 8.4 Implementar validação de tipo de arquivo, tamanho e limite de 3 fotos por ambiente
- [x] 8.5 Adicionar testes unitários e de integração para os três handlers

## Implementation Details

Veja a seção "API Endpoints — Endpoints novos" do TechSpec para os contratos exatos de request/response.

O padrão de upload de imagem existe em `app/api/catalog/[id]/image/route.ts`: leitura do `FormData`, validação de content-type, chamada `supabase.storage.from(...).upload(path, buffer)`, seguida de `createSignedUrl`. Replicar esse padrão.

O path de armazenamento deve ser `${userId}/${roomId}/${photoId}.${ext}` para que cada foto seja namespaced por usuário e ambiente.

### Relevant Files

- `app/api/catalog/[id]/image/route.ts` — padrão exato de upload a replicar
- `supabase/migrations/014_quote_room_photos.sql` (task_01) — tabela `quote_room_photos` com RLS
- `supabase/migrations/015_quote_photos_bucket.sql` (task_01) — bucket `quote-photos`

### Dependent Files

- `components/wizard/step-rooms.tsx` (task_09) — UI que consome esses endpoints
- `lib/pdf/template.ts` (task_09) — template de PDF a receber URLs das fotos

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `app/api/rooms/[roomId]/photos/route.ts` (POST + GET)
- `app/api/rooms/[roomId]/photos/[photoId]/route.ts` (DELETE)
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para upload, listagem e exclusão **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `POST /api/rooms/[roomId]/photos` sem sessão retorna 401
  - [x] `POST /api/rooms/[roomId]/photos` com room de outro usuário retorna 403
  - [x] `POST /api/rooms/[roomId]/photos` com arquivo PDF retorna 422 com mensagem de tipo inválido
  - [x] `POST /api/rooms/[roomId]/photos` com arquivo de 6MB retorna 422 com mensagem de tamanho
  - [x] `POST /api/rooms/[roomId]/photos` com 3 fotos já existentes retorna 422 com mensagem de limite
  - [x] `POST /api/rooms/[roomId]/photos` com arquivo JPEG válido retorna 201 com URL assinada
  - [x] `GET /api/rooms/[roomId]/photos` retorna lista com `id`, `image_url` e `position` de cada foto
  - [x] `DELETE /api/rooms/[roomId]/photos/[photoId]` remove arquivo do Storage e registro do banco
  - [x] `DELETE /api/rooms/[roomId]/photos/[photoId]` com foto de outro usuário retorna 403
- Testes de integração:
  - [x] Fluxo completo: POST upload → GET lista (retorna 1 foto) → DELETE → GET lista (retorna 0 fotos)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Upload, listagem e exclusão funcionam corretamente com o bucket `quote-photos`
- RLS impede acesso a fotos de outros usuários
- Limite de 3 fotos por ambiente é respeitado
