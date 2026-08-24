import { CHART_INK, seriesColor } from '../../lib/chart';
import { formatCompact, formatValue, type Measure } from '../../lib/format';

export type Column = {
  name: string;
  value: number;
  /** Colour slot from the dimension catalog, so a category keeps one hue. */
  slot?: number;
};

/**
 * Magnitude across an ordered sequence — years, cohorts, tiers.
 *
 * Vertical because the categories have a natural order and short labels: the
 * eye reads left-to-right as progression. A nominal set with long names gets
 * horizontal bars instead, where the labels have room.
 *
 * A sequence with no recurring identity — years — takes one hue, because
 * position already carries the order. Categories that appear elsewhere on the
 * page take their catalog slot, so the same cohort is the same colour in every
 * panel it turns up in.
 */
export function ColumnChart({
  columns,
  unit = 'count',
  height = 180,
  compact = false,
  max: imposedMax,
}: {
  columns: Column[];
  unit?: Measure;
  height?: number;
  /** Smaller type and no value labels — for a set of small multiples. */
  compact?: boolean;
  /**
   * A maximum shared across a set of panels. Without it each panel scales to
   * its own tallest column, and forty learners in one hub draw the same height
   * as eighty-six in another — which is the whole point of small multiples,
   * undone.
   */
  max?: number;
}) {
  const max = imposedMax ?? (Math.max(...columns.map((c) => c.value), 0) || 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {columns.map((column) => {
          const pct = Math.max((column.value / max) * 100, column.value > 0 ? 1.5 : 0);
          return (
            <div key={column.name} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              {compact ? null : (
                <span className="tnum text-secondary-text font-medium text-on-surface">
                  {formatValue(column.value, unit)}
                </span>
              )}
              <div
                className="w-full rounded-t"
                style={{
                  height: `${pct}%`,
                  backgroundColor: seriesColor(column.slot ?? 0),
                  minHeight: column.value > 0 ? 3 : 0,
                }}
                title={`${column.name}: ${formatValue(column.value, unit)}`}
              />
            </div>
          );
        })}
      </div>

      <div className="h-px w-full" style={{ backgroundColor: CHART_INK.grid }} />

      <div className="mt-1.5 flex gap-2">
        {columns.map((column) => (
          <div key={column.name} className="min-w-0 flex-1 text-center">
            <span className={`block truncate ${compact ? 'text-xs' : 'text-secondary-text'} text-on-surface-variant`}>
              {column.name}
            </span>
            {compact ? (
              <span className="tnum block text-xs font-medium text-on-surface">
                {formatCompact(column.value, unit)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
