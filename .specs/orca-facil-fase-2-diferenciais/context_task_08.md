# Contexto — task_08

## Requisitos do PRD
Endpoints de backend para upload e exclusão de fotos de ambiente de orçamento.

## Especificação Técnica

### Arquivos a criar
1. `app/api/rooms/[roomId]/photos/route.ts` — handlers `GET` e `POST`
2. `app/api/rooms/[roomId]/photos/[photoId]/route.ts` — handler `DELETE`

### Verificação de ownership
Antes de qualquer operação, verificar que `roomId` pertence ao usuário autenticado:
```sql
SELECT q.id FROM quote_rooms qr
JOIN quote_versions qv ON qv.id = qr.version_id
JOIN quotes q ON q.id = qv.quote_id
WHERE qr.id = $roomId AND q.user_id = $userId
```

### POST /api/rooms/[roomId]/photos
- Aceitar `multipart/form-data` com campo `photo`
- Validar: tipo (jpeg/png/webp), tamanho máximo 5MB
- Upload para bucket `quote-photos` (criado na migration 015) no path: `${userId}/${roomId}/${photoId}.${ext}`
- Usar `createServiceClient()` para o storage (contorna RLS no storage)
- Inserir em `quote_room_photos`: `{ room_id, image_url: storagePath, position }`
- Gerar signed URL com validade de 1h
- Retornar: `{ id, image_url: signedUrl, position }`

### GET /api/rooms/[roomId]/photos
- Buscar todos os registros de `quote_room_photos` onde `room_id = roomId`
- Para cada registro, gerar signed URL (1h) via service client
- Retornar array ordenado por `position`

### DELETE /api/rooms/[roomId]/photos/[photoId]
- Buscar `image_url` (storage path) do registro
- Deletar arquivo do storage com service client
- Deletar registro de `quote_room_photos`
- Retornar `{ success: true }`

### Imports necessários
- `createClient` de `@/lib/supabase/server` (auth)
- `createServiceClient` de `@/lib/supabase/service` (storage)

## Estado de dependências
- task_01 ✓ — tabela `quote_room_photos` e bucket `quote-photos` criados nas migrations 014 e 015
