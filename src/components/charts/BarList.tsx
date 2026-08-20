import type { Unit } from '../../lib/api';
import { CHART_INK, MUTED_MARK, seriesColor } from '../../lib/chart';
import { formatValue } from '../../lib/format';

export type BarRow = {
  name: string;
  value: number;
  /** Share of the whole, 0–1. Rendered after the value when present. */
  share?: number | null;
  /** Marks a figure the API summed from a breakdown rather than read directly. */
  derived?: boolean;
};

/**
 * Ranked magnitude: one row per category, label above the bar.
 */
export function BarList({
  rows,
  unit = 'count',
  scale = 'max',
  highlight,
  onSelect,
}: {
  rows: BarRow[];
  unit?: Unit;
  scale?: 'max' | 'total';
  /** Name of one row to emphasise; the rest recede to grey. */
  highlight?: string;
  onSelect?: (row: BarRow) => void;
}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const basis =
    scale === 'total' ? total || 1 : Math.max(...rows.map((r) => r.value), 0) || 1;

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => {
        const dimmed = Boolean(highlight) && row.name !== highlight;
        const width = Math.max((row.value / basis) * 100, 0.5);

        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-body-text ${dimmed ? 'text-on-surface-variant' : 'font-medium text-on-surface'}`}>
                {row.name}
                {row.derived ? (
                  <span
                    className="ml-1.5 text-xs font-normal text-on-surface-muted"
                    title="No overall total was recorded for this programme, so it is summed from its breakdown."
                  >
                    summed
                  </span>
                ) : null}
              </span>
              <span className="tnum shrink-0 text-body-text text-on-surface-variant">
                <span className="font-medium text-on-surface">{formatValue(row.value, unit)}</span>
                {row.share != null ? (
                  <span className="ml-1.5 text-on-surface-muted">{(row.share * 100).toFixed(1)}%</span>
                ) : null}
              </span>
            </div>
            <div
              className="mt-1.5 h-2.5 w-full overflow-hidden rounded"
              style={{ backgroundColor: CHART_INK.track }}
            >
              <div
                className="h-full rounded"
                style={{ width: `${width}%`, backgroundColor: dimmed ? MUTED_MARK : seriesColor(0) }}
              />
            </div>
          </>
        );

        return (
          <li key={row.name}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(row)}
                className="w-full rounded text-left transition hover:opacity-90"
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
