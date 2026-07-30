# Contexto — task_07

## Requisitos do PRD
Calculadora de chapas de MDF embutida no wizard de ambientes — mostra quantas chapas são necessárias dado o total de área dos itens.

## Especificação Técnica

### Arquivo a modificar
`components/wizard/step-rooms.tsx`

### Dados disponíveis
- `RoomItem` já tem `unit` (pode ser `m²`, `un`, `par`, `h`, etc.)
- `sheet_waste_pct` vem do perfil do usuário — buscar via `GET /api/profile` (campo adicionado pela migration 012). Default: 15%

### Lógica de cálculo
```typescript
const AREA_CHAPA_M2 = 2.750 * 1.830; // = 5.0325 m²

function calcularChapas(items: RoomItem[], wastePct: number): number {
  const areaTotal = items
    .filter(i => i.unit === 'm²')
    .reduce((acc, i) => acc + i.unit_price * 0 + i.quantity, 0); // usar quantity como área
  // Na realidade: área total = soma de (quantity) para itens com unit === 'm²'
  if (areaTotal <= 0) return 0;
  return Math.ceil(areaTotal / (AREA_CHAPA_M2 * (1 - wastePct / 100)));
}
```

Nota: items com `unit !== 'm²'` não contam para o cálculo de área.

### UI
- Exibir por ambiente, abaixo da lista de itens
- Texto: `"Estimativa: ~N chapas de MDF 2,75×1,83m"`
- Mostrar apenas quando `areaTotal > 0`
- Atualizar em tempo real (calcular a partir do state de `rooms`)
- Adicionar `sheet_waste_pct` ao state do componente (buscar do perfil via useEffect + fetch /api/profile)

### Localização no código
`step-rooms.tsx` já tem `rooms` como state (`useState<Room[]>`). Calcular inline dentro do render de cada room.

## Estado de dependências
- task_01 ✓ — coluna `sheet_waste_pct` em profiles criada pela migration 012
