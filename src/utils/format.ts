export const CURRENCY = 'TWD';

const currencyFormatter = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('zh-TW', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return currencyFormatter.format(n);
}

export function formatUSD(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return usdFormatter.format(n);
}

export function formatPercent(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return percentFormatter.format(n);
}
