import { CHART_INK, MARK, SEQUENTIAL, seriesColor } from '../../lib/chart';
import { HoverTooltip, useHoverTooltip } from './Tooltip';
import { formatCompact, formatValue, type Measure } from '../../lib/format';

export type Column = {
  name: string;
  value: number;
  /** Colour slot from the dimension catalog, so a category keeps one hue. */
  slot?: number;
};

/** Gridlines behind the plot, the last of them the baseline. */
const GRID_STEPS = 4;

/**
 * How wide a single column may get, however much room the panel has.
 *
 * Without a cap the columns divide the width between them, so a two-category
 * chart draws two slabs half a panel wide each — a bar chart at the scale of a
 * wall. The cap keeps a mark the size of a mark and leaves the whitespace to do
 * what whitespace is for.
 */
const MAX_BAR_WIDTH = 72;

/**
 * One hue, darkest for the largest.
 *
 * A single-series chart has already said everything through height and
 * position, so a handful of unrelated hues on top of that encodes nothing and
 * reads as several different subjects rather than several values of one.
 * Stepping down a single ramp keeps the chart one object, and the order of the
 * shades repeats the order the heights already show.
 *
 * Spread across the ramp rather than crowded at one end, so two columns take
 * the darkest and a clearly lighter shade rather than two near-identical darks.
 */
function shade(rank: number, count: number): string {
  const last = SEQUENTIAL.length - 1;
  if (count <= 1) return SEQUENTIAL[last];
  const step = Math.round((rank / (count - 1)) * (last - 1));
  return SEQUENTIAL[Math.max(1, last - step)];
}

/**
 * Magnitude across an ordered sequence — years, cohorts, tiers.
 *
 * Vertical because the categories have a natural order and short labels: the
 * eye reads left-to-right as progression. A nominal set with long names gets
 * horizontal bars instead, where the labels have room.
 *
 * Three rows, not one: the values sit in a strip of their own above the plot,
 * the plot holds the gridlines and the columns, and the names sit below. Laid
 * out as one stack the tallest column had to share its height with its own
 * label and was squeezed shorter for it — the one column in the chart whose
 * height was a lie.
 *
 * Colour follows the job. On its own the chart takes one hue stepped by rank,
 * because nothing here needs a second encoding. Inside a set of small multiples
 * it takes the catalog slot instead, so the same cohort is the same colour in
 * every panel of the set — there, identity is the point of the colour.
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

  // Ranked by value, so the ramp runs darkest-largest whatever order the
  // columns are drawn in — a cohort axis stays in cohort order, not value order.
  const rankOf = new Map(
    [...columns].sort((a, b) => b.value - a.value).map((column, rank) => [column.name, rank])
  );

  const fill = (column: Column) =>
    compact ? seriesColor(column.slot ?? 0) : shade(rankOf.get(column.name) ?? 0, columns.length);

  const { frame, hovered, track, clear } = useHoverTooltip<Column>();
  const total = columns.reduce((sum, c) => sum + c.value, 0);

  return (
    <div ref={frame} className="relative w-full">
      {compact ? null : (
        <div className="mb-1.5 flex gap-2">
          {columns.map((column) => (
            <span
              key={column.name}
              className="tnum min-w-0 flex-1 truncate text-center text-secondary-text font-medium text-on-surface"
            >
              {formatValue(column.value, unit)}
            </span>
          ))}
        </div>
      )}

      <div className="relative" style={{ height }}>
        {/*
          Gridlines rather than an axis: every column is labelled with its own
          value already, so these are here to carry the eye across the gaps
          between columns. They stay behind the marks instead of boxing them in.
        */}
        <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
          {Array.from({ length: GRID_STEPS + 1 }).map((_, i) => (
            <div key={i} className="h-px w-full" style={{ backgroundColor: CHART_INK.grid }} />
          ))}
        </div>

        <div className="relative flex h-full items-end gap-2">
          {columns.map((column) => (
            <div
              key={column.name}
              // The whole column is hoverable, not the drawn bar alone: a
              // short bar is a few pixels tall and would be a target nobody
              // could hit.
              onMouseMove={track(column)}
              onMouseLeave={clear}
              className="flex min-w-0 flex-1 cursor-default justify-center self-stretch"
            >
              <div
                className="w-full self-end"
                style={{
                  height: `${Math.max((column.value / max) * 100, column.value > 0 ? 1.5 : 0)}%`,
                  maxWidth: compact ? undefined : MAX_BAR_WIDTH,
                  borderTopLeftRadius: MARK.barRadius,
                  borderTopRightRadius: MARK.barRadius,
                  backgroundColor: fill(column),
                  minHeight: column.value > 0 ? 3 : 0,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        {columns.map((column) => (
          <div
            key={column.name}
            onMouseMove={track(column)}
            onMouseLeave={clear}
            className="min-w-0 flex-1 cursor-default text-center"
          >
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

      {hovered ? (
        <HoverTooltip
          at={hovered}
          title={hovered.data.name}
          value={hovered.data.value}
          share={total ? hovered.data.value / total : null}
          unit={unit}
        />
      ) : null}
    </div>
  );
}
