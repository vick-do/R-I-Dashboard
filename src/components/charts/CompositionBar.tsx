import { seriesColor } from '../../lib/chart';
import { formatValue } from '../../lib/format';
import type { Unit } from '../../lib/api';

export type CompositionRow = {
  name: string;
  total: number;
  segments: Array<{ label: string; value: number; share: number | null }>;
};

/**
 * Part-to-whole across several items — a 100% stacked bar per row.
 */
export function CompositionBar({
  rows,
  legend,
  unit = 'count',
}: {
  rows: CompositionRow[];
  /** Shared segment order. Index decides the colour slot. */
  legend: string[];
  unit?: Unit;
}) {
  const slotOf = (label: string) => {
    const index = legend.indexOf(label);
    return index === -1 ? legend.length : index;
  };

  return (
    <div className="flex flex-col gap-5">
      {rows.map((row) => (
        <div key={row.name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-body-text font-medium text-on-surface">{row.name}</span>
            <span className="tnum text-secondary-text text-on-surface-variant">{formatValue(row.total, unit)}</span>
          </div>

          <div className="mt-1.5 flex h-4 w-full gap-0.5 overflow-hidden rounded">
            {[...row.segments]
              .sort((a, b) => slotOf(a.label) - slotOf(b.label))
              .map((segment) => (
                <div
                  key={segment.label}
                  className="h-full first:rounded-l last:rounded-r"
                  style={{
                    width: `${(segment.share ?? 0) * 100}%`,
                    backgroundColor: seriesColor(slotOf(segment.label)),
                  }}
                  title={`${segment.label}: ${formatValue(segment.value, unit)} (${((segment.share ?? 0) * 100).toFixed(1)}%)`}
                />
              ))}
          </div>

        </div>
      ))}
    </div>
  );
}

/**
 * Legend for the shared segment order. Always rendered for two or more series — identity must
 * never be carried by colour alone.
 */
export function CompositionLegend({ legend }: { legend: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {legend.map((label, index) => (
        <li key={label} className="flex items-center gap-1.5 text-secondary-text text-on-surface-variant">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: seriesColor(index) }}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}
