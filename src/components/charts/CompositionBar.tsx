import { seriesColor } from '../../lib/chart';
import { formatValue, type Measure } from '../../lib/format';
import { HoverTooltip, useHoverTooltip } from './Tooltip';

export type CompositionRow = {
  name: string;
  total: number;
  segments: Array<{ label: string; value: number; share: number | null }>;
};

/**
 * Part-to-whole across several items — a stacked bar per row.
 *
 * Every row fills the width by default, which compares the splits and says
 * nothing about size: a cohort of eleven and a cohort of twenty-five draw the
 * same bar. Pass `max` and the bar is drawn to its own total instead, so length
 * carries the size and the segments still carry the split — the right choice
 * when the rows are quantities rather than rates.
 *
 * Hovering a row shows every figure in it at once, rather than one segment at a
 * time. A reader after a single number is usually comparing it with the one
 * beside it, and a stacked segment is where a number is hardest to read off a
 * scale anyway: it starts wherever the segment before it happened to end.
 */
export function CompositionBar({
  rows,
  legend,
  unit = 'count',
  max,
}: {
  rows: CompositionRow[];
  /** Shared segment order. Index decides the colour slot. */
  legend: string[];
  unit?: Measure;
  /** Scale every row against this total rather than against itself. */
  max?: number;
}) {
  const { frame, hovered, track, clear } = useHoverTooltip<CompositionRow>();

  const slotOf = (label: string) => {
    const index = legend.indexOf(label);
    return index === -1 ? legend.length : index;
  };

  const ordered = (row: CompositionRow) =>
    [...row.segments].sort((a, b) => slotOf(a.label) - slotOf(b.label));

  return (
    <div ref={frame} className="relative flex flex-col gap-5">
      {rows.map((row) => {
        const active = hovered?.data.name === row.name;
        return (
          <div
            key={row.name}
            onMouseMove={track(row)}
            onMouseLeave={clear}
            className="cursor-default"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-text font-medium text-on-surface">{row.name}</span>
              <span className="tnum text-secondary-text text-on-surface-variant">{formatValue(row.total, unit)}</span>
            </div>

            <div
              className="mt-1.5 flex h-4 gap-0.5 overflow-hidden rounded transition-opacity"
              style={{
                width: max ? `${Math.max((row.total / max) * 100, 0.5)}%` : '100%',
                // The rest recede a little rather than going grey. A chart that
                // fades four rows out to answer a question about the fifth has
                // made the comparison harder than it was before.
                opacity: hovered && !active ? 0.72 : 1,
              }}
            >
              {ordered(row).map((segment) => (
                <div
                  key={segment.label}
                  className="h-full first:rounded-l last:rounded-r"
                  style={{
                    width: `${(segment.share ?? 0) * 100}%`,
                    backgroundColor: seriesColor(slotOf(segment.label)),
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {hovered ? (
        <HoverTooltip
          at={hovered}
          title={hovered.data.name}
          unit={unit}
          entries={ordered(hovered.data).map((segment) => ({
            label: segment.label,
            value: segment.value,
            share: segment.share,
            color: seriesColor(slotOf(segment.label)),
          }))}
          footer={{ label: 'Total', text: formatValue(hovered.data.total, unit) }}
        />
      ) : null}
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
