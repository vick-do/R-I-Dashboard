import type { Unit } from '../../lib/api';
import { formatValue } from '../../lib/format';

/**
 * A single headline figure.
 *
 * Per the data-viz form heuristic, a handful of headline numbers is a KPI row
 * of stat tiles — not a bar chart of one bar each.
 *
 * `basis` is surfaced rather than hidden: a figure summed from a breakdown is
 * labelled as such, so a derived number is never presented as a recorded one.
 */
export type StatTileProps = {
  label: string;
  value: number | null;
  unit?: Unit;
  detail?: string;
  basis?: 'recorded_total' | 'derived_from_breakdown' | 'no_data';
  derivedFrom?: string[] | null;
  emphasis?: boolean;
};

export function StatTile({
  label,
  value,
  unit = 'count',
  detail,
  basis,
  derivedFrom,
  emphasis = false,
}: StatTileProps) {
  const noData = value === null || basis === 'no_data';

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft ${
        emphasis ? 'border-brand bg-brand text-white shadow-card' : 'border-slate-200 bg-surface shadow-card'
      }`}
    >
      <p
        className={`text-[0.7rem] font-medium uppercase tracking-wider ${
          emphasis ? 'text-white/80' : 'text-ink-muted'
        }`}
      >
        {label}
      </p>

      <p
        className={`text-2xl font-bold leading-tight ${
          emphasis ? 'text-white' : noData ? 'text-ink-muted' : 'text-ink'
        }`}
      >
        {noData ? 'No data yet' : formatValue(value, unit)}
      </p>

      {/* Every colour here is stated on both branches so the emphasised tile
          never inherits a low-contrast neutral onto its brand fill. */}
      {detail ? (
        <p className={`text-xs ${emphasis ? 'text-white/85' : 'text-ink-secondary'}`}>{detail}</p>
      ) : null}

      {basis === 'derived_from_breakdown' ? (
        <p
          className={`text-[0.68rem] ${emphasis ? 'text-white/75' : 'text-ink-muted'}`}
          title="No overall total was recorded for this metric, so it is summed from the breakdown."
        >
          Summed across {derivedFrom?.map((d) => d.toLowerCase()).join(' × ') ?? 'breakdown'}
        </p>
      ) : null}
    </div>
  );
}
