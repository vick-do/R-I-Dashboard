import type { Unit } from '../../lib/api';
import { seriesColor } from '../../lib/chart';
import { formatValue } from '../../lib/format';

export type DonutSlice = {
  name: string;
  value: number;
  /** Marks a figure the API summed from a breakdown rather than read directly. */
  derived?: boolean;
  /**
   * Fixes this slice's colour slot. Given across a set of small multiples, a
   * category keeps one colour in every ring — colour follows the entity, never
   * its rank inside one chart.
   */
  slot?: number;
};

/**
 * Part-to-whole as a ring, with the total in the middle.
 */
const RADIUS = 70;
const STROKE = 26;
const GAP = 2.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_SLICES = 6;

export function DonutChart({
  slices,
  unit = 'count',
  centerLabel,
  compact = false,
}: {
  slices: DonutSlice[];
  unit?: Unit;
  /** Wording under the total, e.g. "people trained". */
  centerLabel?: string;
  /** Ring only, no legend — for a set of small multiples that share one. */
  compact?: boolean;
}) {
  // With explicit slots the arc order follows them, so the same category sits
  // in the same place in every ring of a set.
  const hasSlots = slices.some((s) => s.slot !== undefined);
  const sorted = hasSlots
    ? [...slices].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    : [...slices].sort((a, b) => b.value - a.value);

  const shown =
    sorted.length > MAX_SLICES
      ? [
          ...sorted.slice(0, MAX_SLICES - 1),
          {
            name: 'Other',
            value: sorted.slice(MAX_SLICES - 1).reduce((sum, s) => sum + s.value, 0),
          },
        ]
      : sorted;

  const total = shown.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  let cursor = 0;
  const arcs = shown.map((slice, index) => {
    const share = slice.value / total;
    const length = share * CIRCUMFERENCE;
    // A slice too small to carry the gap keeps a hairline rather than inverting.
    const dash = Math.max(length - GAP, 0.75);
    const arc = {
      ...slice,
      share,
      color: seriesColor(slice.slot ?? index),
      dash,
      offset: -cursor,
    };
    cursor += length;
    return arc;
  });

  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center gap-2'
          : 'flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8'
      }
    >
      <svg
        viewBox="0 0 200 200"
        className={compact ? 'h-[132px] w-[132px] shrink-0' : 'h-[180px] w-[180px] shrink-0'}
        role="img"
        aria-label={`${formatValue(total, unit)} total across ${shown.length} ${
          shown.length === 1 ? 'entry' : 'entries'
        }`}
      >
        <g transform="rotate(-90 100 100)">
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth={STROKE} />
          {arcs.map((arc) => (
            <circle
              key={arc.name}
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={arc.offset}
            >
              <title>{`${arc.name}: ${formatValue(arc.value, unit)} (${(arc.share * 100).toFixed(1)}%)`}</title>
            </circle>
          ))}
        </g>

        <text
          x="100"
          y="96"
          textAnchor="middle"
          className="fill-on-surface"
          style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}
        >
          {formatValue(total, unit)}
        </text>
        {centerLabel ? (
          <text x="100" y="116" textAnchor="middle" className="fill-on-surface-muted" style={{ fontSize: 11 }}>
            {centerLabel}
          </text>
        ) : null}
      </svg>

      {/* The legend is the chart's relief channel: it carries identity, the
          exact value, and the share, so nothing rests on arc length alone. A
          compact ring leaves that to the set's shared legend and its own table. */}
      {compact ? null : (
      <ul className="flex w-full min-w-0 flex-col gap-3">
        {arcs.map((arc) => (
          <li key={arc.name} className="flex items-baseline gap-2.5">
            <span
              aria-hidden="true"
              className="relative top-[3px] h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: arc.color }}
            />
            <span className="min-w-0 flex-1 truncate text-body-text text-on-surface">
              {arc.name}
              {arc.derived ? (
                <span
                  className="ml-1.5 text-xs text-on-surface-muted"
                  title="No overall total was recorded for this programme, so it is summed from its breakdown."
                >
                  summed
                </span>
              ) : null}
            </span>
            <span className="tnum shrink-0 text-body-text font-medium text-on-surface">
              {formatValue(arc.value, unit)}
            </span>
            <span className="tnum w-12 shrink-0 text-right text-secondary-text text-on-surface-muted">
              {(arc.share * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
