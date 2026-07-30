# Contexto — task_11

## Requisitos do PRD (seções relevantes)

- Marceneiro acompanha todos os seus orçamentos em uma lista
- Filtros por status: rascunho, enviado, aprovado, rejeitado, expirado
- Ação de duplicar orçamento (criar cópia com novo número e status draft)
- Acesso ao PDF já gerado (nova signed URL — pode ter expirado)
- Atualização manual de status (ex: "Marcar como aprovado" quando cliente confirmar)
- Mobile-first, chips de filtro horizontais rolável

## Especificação Técnica (seções relevantes)

### Status de orçamento
```
'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
```

### GET /api/quotes — listagem com filtros
- Params opcionais: `?status=&page=1&limit=20`
- Retorna: `{ quotes: [...], total, page, limit }`
- Cada item: `{ id, quote_number, customer_name, status, total_with_margin, created_at, latest_pdf_url? }`
- total_with_margin: calculado via JOIN em quote_items × profit_margin_pct da versão
- Ordenar por created_at DESC

### POST /api/quotes/[id]/duplicate — duplicação
- Clonar recursivamente: quotes → quote_versions → quote_rooms → quote_items
- Novo `quote_number` via `next_quote_number(user_id)`
- Novo status = 'draft'
- SEM quote_pdfs (começa limpo)
- Retorna: `{ new_quote_id }`

### PATCH /api/quotes/[id] — atualizar status
- Body: `{ status: 'draft'|'sent'|'accepted'|'rejected'|'expired' }`
- Pode já existir da task_09 (verificar e adicionar se necessário)

### GET /api/quotes/[id]/pdf/latest — última URL do PDF
- Busca `quote_pdfs WHERE quote_id = :id ORDER BY created_at DESC LIMIT 1`
- Gera NOVA signed URL para o `storage_path` (não retorna a URL salva — pode ter expirado)
- Retorna: `{ signed_url }`

### Arquivos a criar
```
app/(app)/orcamentos/page.tsx          — página de listagem
app/api/quotes/route.ts                — NOTA: pode já existir (task_08 criou POST). 
                                          Verificar se GET está implementado.
app/api/quotes/[id]/duplicate/route.ts — POST de duplicação
app/api/quotes/[id]/pdf/latest/route.ts — GET da última PDF URL
components/quote-card.tsx              — card de orçamento na listagem
```

**ATENÇÃO:** `app/api/quotes/route.ts` já foi criado pela task_08 com o método POST. A task_11 deve ADICIONAR o método GET ao mesmo arquivo — não substituir o POST.

## Estado de dependências

- task_08 ✅ — POST /api/quotes existe; `next_quote_number()` está sendo usado
- task_09 ✅ — PATCH /api/quotes/[id] pode existir; verificar arquivo
- task_10 ✅ — quote_pdfs tem registros; bucket pdfs com storage_paths; signed URLs de 7 dias

## Observações importantes

- O worker deve instalar dependências com `npm install` no worktree antes de implementar
- Ler AGENTS.md antes de qualquer código Next.js (breaking changes no Next.js 16)
- Verificar se `app/api/quotes/route.ts` já tem GET antes de criar
- Verificar se `app/api/quotes/[id]/route.ts` já tem PATCH de status
- Filtros de status na UI: chips horizontais scrolláveis em mobile
- Guard de subscription: GET é permitido para read_only; POST de duplicate e PATCH de status requerem read/write
