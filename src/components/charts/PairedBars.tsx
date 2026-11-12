import { CHART_INK, MARK, ORDINAL } from '../../lib/chart';
import { HoverTooltip, useHoverTooltip } from './Tooltip';
import { formatValue, type Measure } from '../../lib/format';

export type PairedRow = {
  name: string;
  before: number;
  after: number;
};

/**
 * One measurement at two points in time, per category.
 *
 * Two bars under a shared label rather than two separate charts: before and
 * after are the same question asked twice, and the thing worth reading is the
 * distance between them. Split across two panels that distance has to be held
 * in the reader's head — 32.1% in one chart, 80.8% in another, each scaled to
 * its own tallest bar, so the smaller figure can draw the longer bar.
 *
 * The pair takes one hue at two lightnesses, not two hues. Two colours would
 * say these are different things being compared; one hue getting darker says it
 * is the same thing later, which is what happened.
 *
 * Both bars share one scale, and a percentage is scaled against 100 rather than
 * against the tallest bar present — otherwise the highest-scoring discipline
 * always fills the row and every cohort looks equally confident.
 */
export function PairedBars({
  rows,
  unit = 'percent',
  beforeLabel = 'Before',
  afterLabel = 'After',
}: {
  rows: PairedRow[];
  unit?: Measure;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const isPercent = typeof unit === 'string' ? unit === 'percent' : unit.unit === 'percent';
  const max = isPercent
    ? 100
    : Math.max(...rows.flatMap((r) => [r.before, r.after]), 0) || 1;

  const width = (value: number) => `${Math.max((value / max) * 100, value > 0 ? 0.5 : 0)}%`;

  const { frame, hovered, track, clear } = useHoverTooltip<PairedRow>();

  const change = (row: PairedRow) => {
    const delta = row.after - row.before;
    return `${delta >= 0 ? '+' : '−'}${
      isPercent ? `${Math.abs(delta).toFixed(1)} pts` : formatValue(Math.abs(delta), unit)
    }`;
  };

  return (
    <div ref={frame} className="relative flex flex-col gap-5">
      <ul className="flex flex-col gap-5">
        {rows.map((row) => (
          <li key={row.name} onMouseMove={track(row)} onMouseLeave={clear} className="cursor-default">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-body-text font-medium text-on-surface">{row.name}</span>
                <span className="tnum shrink-0 text-body-text text-on-surface-variant">
                  {formatValue(row.before, unit)}
                  <span className="mx-1.5 text-on-surface-muted" aria-hidden="true">
                    →
                  </span>
                  <span className="font-medium text-on-surface">{formatValue(row.after, unit)}</span>
                  {/*
                    A rise from 32% to 81% is 49 points, not 152%. Naming the
                    unit keeps the two readings of "up by" apart.
                  */}
                  <span className="ml-2 text-on-surface-muted">{change(row)}</span>
                </span>
              </div>

              <div className="mt-2 flex flex-col" style={{ gap: MARK.barGap }}>
                {[
                  { label: beforeLabel, value: row.before, fill: ORDINAL[0] },
                  { label: afterLabel, value: row.after, fill: ORDINAL[2] },
                ].map((bar) => (
                  <div
                    key={bar.label}
                    className="h-2.5 w-full overflow-hidden rounded"
                    style={{ backgroundColor: CHART_INK.track }}
                  >
                    <div
                      className="h-full rounded"
                      style={{ width: width(bar.value), backgroundColor: bar.fill }}
                    />
                  </div>
                ))}
              </div>
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {[
          { label: beforeLabel, fill: ORDINAL[0] },
          { label: afterLabel, fill: ORDINAL[2] },
        ].map((entry) => (
          <li key={entry.label} className="flex items-center gap-2 text-secondary-text text-on-surface-variant">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.fill }}
            />
            {entry.label}
          </li>
        ))}
      </ul>

      {hovered ? (
        <HoverTooltip
          at={hovered}
          title={hovered.data.name}
          unit={unit}
          entries={[
            { label: beforeLabel, value: hovered.data.before, color: ORDINAL[0] },
            { label: afterLabel, value: hovered.data.after, color: ORDINAL[2] },
          ]}
          footer={{ label: 'Change', text: change(hovered.data) }}
        />
      ) : null}
    </div>
  );
}
