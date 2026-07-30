# Contexto — task_02

## Requisitos do PRD
Cria `lib/catalog/regional-defaults.ts` com dados estáticos de materiais e serviços de marcenaria por estado brasileiro. Usados como fallback pelo endpoint `GET /api/catalog/regional-suggestions` (task_15).

## Especificação Técnica

### Tipo exportado
```typescript
export type RegionalItem = {
  name: string;
  type: 'material' | 'service';
  unit: string;
  unit_price: number;
};

export const REGIONAL_DEFAULTS: Record<string, RegionalItem[]> = {
  SP: [...],
  RJ: [...],
  // todas as 27 UFs
};
```

### Requisitos de conteúdo
- Ao menos 10 itens por UF
- Materiais comuns: MDF 15mm, MDF 18mm, MDF 25mm, compensado naval, ferragens kit, dobradiça 35mm, corrediça telescópica, puxador, parafusos, fundo duro 3mm
- Serviços: mão de obra hora, montagem projeto, instalação
- `unit_price > 0` em todos os itens
- Comentário no topo com data de revisão dos preços (use 2026-07-25)
- Preços devem variar razoavelmente por região (Sul/Sudeste mais caro, Norte/Nordeste mais barato)
- Unidades comuns: `m²`, `un`, `par`, `kit`, `h`

### Estrutura do arquivo
- Arquivo único: `lib/catalog/regional-defaults.ts`
- Sem dependências externas (zero imports de runtime)
- Exportar `RegionalItem` (type) e `REGIONAL_DEFAULTS` (const)

## Estado de dependências
Nenhuma dependência — task independente.
