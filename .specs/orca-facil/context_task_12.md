# Contexto — task_12

## Requisitos do PRD (seções relevantes)

- Marceneiro pode criar variantes do mesmo orçamento (ex: "Padrão" e "Premium")
- Cada versão tem seus próprios ambientes e itens
- Gerar PDF comparativo quando múltiplas versões selecionadas
- Interface de abas no wizard para trocar de versão
- Diferencial competitivo: cliente vê opções lado a lado

## Especificação Técnica (seções relevantes)

### Tabela quote_versions (já existe, task_08 criou versão inicial)
```sql
CREATE TABLE quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id),
  version_number int NOT NULL DEFAULT 1,
  name text DEFAULT 'Padrão',           -- nome da variante
  sort_order int DEFAULT 0,
  profit_margin_pct numeric(5,2),
  quote_validity_days int,
  notes text,
  created_at timestamptz DEFAULT now()
);
```
(verificar se coluna `name` e `sort_order` existem no schema atual)

### API Endpoints

**POST /api/quotes/[id]/versions**
- Body: `{ name: string }`
- Cria nova versão (sort_order = max + 1)
- Retorna: `{ version_id, version_number }`

**PATCH /api/quotes/[id]/versions/[vid]**
- Body: `{ name?: string, profit_margin_pct?: number, notes?: string }`

**DELETE /api/quotes/[id]/versions/[vid]**
- Guard: se for a única versão → retorna 409 com mensagem "Deve existir ao menos uma versão"
- Caso contrário: deleta em cascata (rooms → items via FK ON DELETE CASCADE)

### UI — Abas de versões no wizard

Em `components/wizard/step-rooms.tsx` (já existe, task_08):
- Adicionar abas horizontais no topo (uma aba por versão)
- Aba ativa = versão selecionada
- Botão "+" ao lado das abas abre modal para criar nova versão com nome
- Trocar de aba muda o `activeVersionId` no estado do wizard — sem reload

Em `components/wizard/step-send.tsx` (task_10):
- Adicionar checkboxes de versões para selecionar quais incluir no PDF
- Por padrão: todas selecionadas
- PDF gerado com `version_ids = [...]` das versões marcadas

### PDF multi-versão

Atualizar `lib/pdf/template.ts` (task_10) para:
- Se `version_ids.length > 1`: incluir tabela comparativa no topo:
  ```
  | Ambiente  | Versão Padrão | Versão Premium |
  |-----------|--------------|----------------|
  | Cozinha   | R$ 5.000     | R$ 8.000       |
  | Total     | R$ 8.000     | R$ 13.000      |
  ```
- Seguida do detalhamento individual de cada versão

### Arquivos a criar/modificar
```
app/api/quotes/[id]/versions/route.ts          — POST (nova versão)
app/api/quotes/[id]/versions/[vid]/route.ts    — PATCH + DELETE
components/wizard/step-rooms.tsx               — adicionar abas de versões (MODIFICAR)
components/wizard/step-send.tsx                — adicionar seletor de versões (MODIFICAR)
lib/pdf/template.ts                            — suporte a multi-versão (MODIFICAR)
```

## Estado de dependências

- task_08 ✅ — quote_versions existem (versão única criada no POST /api/quotes); wizard state tem versionId; step-rooms.tsx existe
- task_10 ✅ — POST /api/quotes/[id]/pdf já recebe version_ids[]; lib/pdf/template.ts existe com modo summary/detailed

## Observações importantes

- O worker deve instalar dependências com `npm install` no worktree antes de implementar
- Ler AGENTS.md antes de qualquer código Next.js (breaking changes no Next.js 16)
- Verificar se `quote_versions` tem coluna `name` e `sort_order` — se não, criar migration
- Verificar se DELETE CASCADE está configurado em `quote_rooms` → `quote_items`
- step-rooms.tsx e step-send.tsx já existem — MODIFICAR, não criar do zero
- lib/pdf/template.ts já existe — MODIFICAR para suporte multi-versão
- task_11 também cria/modifica alguns endpoints de quotes — task_12 não deve conflitar
  - task_12 cria: `versions/route.ts` e `versions/[vid]/route.ts` (novos arquivos — sem conflito)
  - task_12 modifica: step-rooms.tsx, step-send.tsx, lib/pdf/template.ts
