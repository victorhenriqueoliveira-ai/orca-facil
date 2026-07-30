import { describe, it, expect } from 'vitest';
import { REGIONAL_DEFAULTS, type RegionalItem } from '@/lib/catalog/regional-defaults';

// Lista oficial das 27 UFs brasileiras
const UFS_BRASILEIRAS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

describe('REGIONAL_DEFAULTS', () => {
  it('deve conter exatamente 27 chaves correspondentes às UFs brasileiras', () => {
    const chaves = Object.keys(REGIONAL_DEFAULTS).sort();
    const ufsEsperadas = [...UFS_BRASILEIRAS].sort();

    expect(chaves).toEqual(ufsEsperadas);
  });

  it('deve ter ao menos 5 itens por UF', () => {
    for (const uf of UFS_BRASILEIRAS) {
      const itens = REGIONAL_DEFAULTS[uf];
      expect(itens, `UF ${uf} deve ter ao menos 5 itens`).toBeDefined();
      expect(itens.length, `UF ${uf} tem ${itens.length} itens, esperado >=5`).toBeGreaterThanOrEqual(5);
    }
  });

  it('deve ter todos os itens com unit_price > 0', () => {
    for (const [uf, itens] of Object.entries(REGIONAL_DEFAULTS)) {
      for (const item of itens) {
        expect(
          item.unit_price,
          `UF ${uf} - item "${item.name}" tem unit_price=${item.unit_price}`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('deve ter todos os itens com type igual a "material" ou "service"', () => {
    const tiposValidos = new Set(['material', 'service']);
    for (const [uf, itens] of Object.entries(REGIONAL_DEFAULTS)) {
      for (const item of itens) {
        expect(
          tiposValidos.has(item.type),
          `UF ${uf} - item "${item.name}" tem type inválido: "${item.type}"`
        ).toBe(true);
      }
    }
  });

  it('deve ter todos os itens com unit não vazio', () => {
    for (const [uf, itens] of Object.entries(REGIONAL_DEFAULTS)) {
      for (const item of itens) {
        expect(
          item.unit,
          `UF ${uf} - item "${item.name}" tem unit vazio`
        ).toBeTruthy();
        expect(
          item.unit.trim().length,
          `UF ${uf} - item "${item.name}" tem unit vazio após trim`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('deve ter todos os itens com name não vazio', () => {
    for (const [uf, itens] of Object.entries(REGIONAL_DEFAULTS)) {
      for (const item of itens) {
        expect(
          item.name,
          `UF ${uf} tem item com name vazio`
        ).toBeTruthy();
        expect(item.name.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('RegionalItem — contrato do tipo', () => {
  it('deve ter todos os campos obrigatórios (name, type, unit, unit_price)', () => {
    // Pega o primeiro item de SP como amostra representativa
    const amostra: RegionalItem = REGIONAL_DEFAULTS['SP'][0];
    expect(amostra).toHaveProperty('name');
    expect(amostra).toHaveProperty('type');
    expect(amostra).toHaveProperty('unit');
    expect(amostra).toHaveProperty('unit_price');
  });

  it('deve ter name como string', () => {
    const amostra = REGIONAL_DEFAULTS['SP'][0];
    expect(typeof amostra.name).toBe('string');
  });

  it('deve ter type como string', () => {
    const amostra = REGIONAL_DEFAULTS['SP'][0];
    expect(typeof amostra.type).toBe('string');
  });

  it('deve ter unit como string', () => {
    const amostra = REGIONAL_DEFAULTS['SP'][0];
    expect(typeof amostra.unit).toBe('string');
  });

  it('deve ter unit_price como number', () => {
    const amostra = REGIONAL_DEFAULTS['SP'][0];
    expect(typeof amostra.unit_price).toBe('number');
  });
});

describe('Integração — import direto por UF', () => {
  it('SP deve retornar array com ao menos 5 itens sem erro de runtime', () => {
    const itensSP = REGIONAL_DEFAULTS['SP'];
    expect(Array.isArray(itensSP)).toBe(true);
    expect(itensSP.length).toBeGreaterThanOrEqual(5);
  });

  it('AM deve retornar array com ao menos 5 itens (Norte)', () => {
    const itensAM = REGIONAL_DEFAULTS['AM'];
    expect(Array.isArray(itensAM)).toBe(true);
    expect(itensAM.length).toBeGreaterThanOrEqual(5);
  });

  it('DF deve retornar array com ao menos 5 itens (Centro-Oeste)', () => {
    const itensDF = REGIONAL_DEFAULTS['DF'];
    expect(Array.isArray(itensDF)).toBe(true);
    expect(itensDF.length).toBeGreaterThanOrEqual(5);
  });

  it('BA deve retornar array com ao menos 5 itens (Nordeste)', () => {
    const itensBA = REGIONAL_DEFAULTS['BA'];
    expect(Array.isArray(itensBA)).toBe(true);
    expect(itensBA.length).toBeGreaterThanOrEqual(5);
  });

  it('RS deve retornar array com ao menos 5 itens (Sul)', () => {
    const itensRS = REGIONAL_DEFAULTS['RS'];
    expect(Array.isArray(itensRS)).toBe(true);
    expect(itensRS.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Variação regional de preços', () => {
  it('MDF 15mm deve ser mais caro em SP do que em CE', () => {
    const mdfSP = REGIONAL_DEFAULTS['SP'].find(i => i.name === 'MDF 15mm');
    const mdfCE = REGIONAL_DEFAULTS['CE'].find(i => i.name === 'MDF 15mm');
    expect(mdfSP).toBeDefined();
    expect(mdfCE).toBeDefined();
    expect(mdfSP!.unit_price).toBeGreaterThan(mdfCE!.unit_price);
  });

  it('Mão de obra hora deve ser mais cara no Sul/Sudeste do que no Nordeste', () => {
    const moPR = REGIONAL_DEFAULTS['PR'].find(i => i.name === 'Mão de obra hora');
    const moPI = REGIONAL_DEFAULTS['PI'].find(i => i.name === 'Mão de obra hora');
    expect(moPR).toBeDefined();
    expect(moPI).toBeDefined();
    expect(moPR!.unit_price).toBeGreaterThan(moPI!.unit_price);
  });
});
