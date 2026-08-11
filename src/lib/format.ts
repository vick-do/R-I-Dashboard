import type { Unit } from './api';

/**
 * Number formatting.
 *
 * `formatValue` is the only place a figure becomes text, so a count, a currency
 * amount and a rate can never be rendered with the wrong shape.
 */
export function formatValue(value: number | null | undefined, unit: Unit = 'count'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  switch (unit) {
    case 'currency':
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: value >= 1000 ? 0 : 2,
      }).format(value);
    case 'percent':
      return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)}%`;
    case 'ratio':
      return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value)}×`;
    default:
      return new Intl.NumberFormat('en-GB').format(value);
  }
}

/** Abbreviated form for axis ticks, where space is tight. 2,800,672 → 2.8M */
export function formatCompact(value: number, unit: Unit = 'count'): string {
  if (unit === 'percent') return `${value}%`;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return new Intl.NumberFormat('en-GB').format(value);
}

/** "February 2026" → "Feb", for compact time axes. */
export function shortPeriod(label: string | null): string {
  if (!label) return '';
  const [month] = label.split(' ');
  return month.length > 4 ? month.slice(0, 3) : month;
}

/** Turns a stored dimension slug into a readable label when no catalog entry exists. */
export function humanise(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
