/**
 * Shared BDT ↔ USD conversion helpers.
 * Amounts in the database stay in their base currency; conversion is display/calc only.
 */

export const SUPPORTED_CURRENCIES = ['USD', 'BDT'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Default: how many BDT equal 1 USD */
export const DEFAULT_BDT_PER_USD = 122;

export function normalizeCurrency(code?: string | null): SupportedCurrency {
  const next = String(code || 'BDT').toUpperCase();
  return next === 'USD' ? 'USD' : 'BDT';
}

/**
 * Convert an amount between USD and BDT using bdtPerUsd (BDT units per 1 USD).
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  bdtPerUsd: number = DEFAULT_BDT_PER_USD,
): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;

  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return value;

  const rate = Number(bdtPerUsd);
  if (!Number.isFinite(rate) || rate <= 0) return value;

  const asUsd = from === 'USD' ? value : value / rate;
  const converted = to === 'USD' ? asUsd : asUsd * rate;
  return Math.round(converted * 100) / 100;
}
