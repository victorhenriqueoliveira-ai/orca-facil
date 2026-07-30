/**
 * Utilitários para alerta de preço desatualizado no catálogo.
 */

/**
 * Calcula quantos dias se passaram desde a última atualização de preço.
 * Retorna 999 se price_updated_at for nulo/inválido.
 */
export function diasDesdeAtualizacao(price_updated_at: string | null | undefined): number {
  if (!price_updated_at) return 999;
  const diff = Date.now() - new Date(price_updated_at).getTime();
  if (isNaN(diff)) return 999;
  return Math.floor(diff / 86400000);
}

/**
 * Verifica se o preço está desatualizado conforme o threshold em dias.
 */
export function precoDesatualizado(
  price_updated_at: string | null | undefined,
  priceAlertDays: number
): boolean {
  return diasDesdeAtualizacao(price_updated_at) >= priceAlertDays;
}
