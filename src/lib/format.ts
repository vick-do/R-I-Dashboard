import type { Unit } from './api';

/**
 * Number formatting.
 */
/**
 * How to render a metric's numbers: its unit, and for money its currency.
 *
 * Everything that formats a figure takes this rather than a bare `Unit`, so a
 * currency travels with its number all the way to the axis tick. A bare `Unit`
 * is still accepted, because most metrics are counts and have nothing to carry.
 */
export type Measure = Unit | { unit: Unit; currency?: string | null };

const unitOf = (m: Measure): Unit => (typeof m === 'string' ? m : m.unit);
const currencyOf = (m: Measure): string =>
  (typeof m === 'string' ? null : m.currency) || 'USD';

export function formatValue(value: number | null | undefined, measure: Measure = 'count'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  const unit = unitOf(measure);
  const currency = currencyOf(measure);

  switch (unit) {
    case 'currency':
      // The currency comes from the metric, not from a house default: the
      // EdTech Fellowship reports cedis and UNDP-YAI dollars, and the same
      // number under the wrong symbol is a different figure.
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: value >= 1000 ? 0 : 2,
      }).format(value);
    case 'percent':
      return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)}%`;
    case 'ratio':
      return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value)}×`;
    default:
      // Counts are whole things. Some arrive fractional because the source
      // apportioned them — the EdTech Fellowship reports 823,776.48 learners —
      // and showing the decimal implies a precision the estimate does not have.
      return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
  }
}

/** Abbreviated form for axis ticks, where space is tight. 2,800,672 → 2.8M */
export function formatCompact(value: number, measure: Measure = 'count'): string {
  const unit = unitOf(measure);
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
