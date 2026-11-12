import { useRef, useState, type MouseEvent } from 'react';
import { formatValue, type Measure } from '../../lib/format';

type Entry = { name?: string; value?: number; color?: string; dataKey?: string | number };

/**
 * Shared hover tooltip.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  unit = 'count',
  labelSuffix,
}: {
  active?: boolean;
  payload?: Entry[];
  label?: string | number;
  unit?: Measure;
  labelSuffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-outline-variant bg-white px-3 py-2 shadow-floating">
      {label !== undefined ? (
        <p className="mb-1 text-xs font-semibold text-on-surface">
          {label}
          {labelSuffix ? <span className="font-normal text-on-surface-muted"> {labelSuffix}</span> : null}
        </p>
      ) : null}

      <ul className="space-y-0.5">
        {payload.map((entry, index) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-on-surface-variant">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-on-surface">
              {formatValue(entry.value ?? null, unit)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A figure in a hover tooltip, for marks that hold more than one.
 */
export type TooltipEntry = { label: string; value: number; share?: number | null; color?: string };

export type TooltipAnchor = { x: number; y: number; below: boolean };

/** Keeps the tooltip this far inside the chart's own box. */
const EDGE_PADDING = 90;

/** How far from the pointer the tooltip floats. */
const POINTER_OFFSET = 12;

/**
 * Roughly how tall a tooltip gets. With less clearance than this above the
 * pointer it flips underneath, rather than escaping the panel on the top row —
 * which is the row a reader goes to first.
 */
const FLIP_CLEARANCE = 120;

/**
 * Hover state for a chart drawn as HTML or SVG elements rather than by a chart
 * library.
 *
 * Every one of these charts used to lean on the browser's `title` attribute,
 * which waits about a second, renders as an OS tooltip nothing else on the page
 * looks like, and shows one value at a time. This gives them the same hover the
 * line chart already had.
 *
 * The caller puts `frame` on a positioned wrapper, `track(datum)` on whatever
 * should be hoverable — the whole row or column, not just the few pixels of
 * the mark — and renders `<HoverTooltip at={hovered} …>`.
 */
export function useHoverTooltip<T>() {
  const frame = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<(TooltipAnchor & { data: T }) | null>(null);

  const track = (data: T) => (event: MouseEvent) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;

    const x = event.clientX - box.left;
    const y = event.clientY - box.top;

    setHovered({
      data,
      // Clamped, so a mark hovered near an edge does not push the tooltip out
      // of the panel.
      x: Math.min(Math.max(x, EDGE_PADDING), Math.max(box.width - EDGE_PADDING, EDGE_PADDING)),
      y,
      below: y < FLIP_CLEARANCE,
    });
  };

  return { frame, hovered, track, clear: () => setHovered(null) };
}

/**
 * The tooltip itself: a title, then either one headline figure or a list of
 * them, and an optional closing line for a total or a change.
 */
export function HoverTooltip({
  at,
  title,
  value,
  share,
  entries,
  footer,
  unit = 'count',
}: {
  at: TooltipAnchor;
  title: string;
  /** One figure, for a mark that carries a single value. */
  value?: number;
  share?: number | null;
  /** Several figures, for a stacked or paired mark. */
  entries?: TooltipEntry[];
  footer?: { label: string; text: string };
  unit?: Measure;
}) {
  const hasBody = value !== undefined || Boolean(entries?.length) || Boolean(footer);

  return (
    <div
      role="status"
      className={`pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-outline-variant bg-white px-3 py-2 shadow-floating ${
        at.below ? '' : '-translate-y-full'
      }`}
      style={{ left: at.x, top: at.y + (at.below ? POINTER_OFFSET : -POINTER_OFFSET) }}
    >
      <p className={`text-xs font-semibold text-on-surface ${hasBody ? 'mb-1' : ''}`}>{title}</p>

      {value !== undefined ? (
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold tabular-nums text-on-surface">{formatValue(value, unit)}</span>
          {share != null ? (
            <span className="tabular-nums text-on-surface-muted">{(share * 100).toFixed(1)}%</span>
          ) : null}
        </p>
      ) : null}

      {entries?.length ? (
        <ul className="space-y-0.5">
          {entries.map((entry) => (
            <li key={entry.label} className="flex items-center gap-2 text-xs">
              {entry.color ? (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
              ) : null}
              <span className="text-on-surface-variant">{entry.label}</span>
              <span className="ml-auto pl-3 font-semibold tabular-nums text-on-surface">
                {formatValue(entry.value, unit)}
              </span>
              {entry.share !== undefined ? (
                <span className="w-12 shrink-0 text-right tabular-nums text-on-surface-muted">
                  {entry.share == null ? '—' : `${(entry.share * 100).toFixed(1)}%`}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {footer ? (
        <p className="mt-1 flex items-center gap-2 border-t border-outline-variant pt-1 text-xs">
          <span className="text-on-surface-variant">{footer.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-on-surface">{footer.text}</span>
          {entries?.some((e) => e.share !== undefined) ? <span className="w-12 shrink-0" /> : null}
        </p>
      ) : null}
    </div>
  );
}
