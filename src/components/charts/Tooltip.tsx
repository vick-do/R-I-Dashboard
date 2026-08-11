import type { Unit } from '../../lib/api';
import { formatValue } from '../../lib/format';

type Entry = { name?: string; value?: number; color?: string; dataKey?: string | number };

/**
 * Shared hover tooltip.
 *
 * Values wear text tokens; the series colour appears only as a small swatch
 * beside the label, so identity is carried by the mark rather than by tinted
 * text.
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
  unit?: Unit;
  labelSuffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-soft">
      {label !== undefined ? (
        <p className="mb-1 text-xs font-semibold text-ink">
          {label}
          {labelSuffix ? <span className="font-normal text-ink-muted"> {labelSuffix}</span> : null}
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
            <span className="text-ink-secondary">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">
              {formatValue(entry.value ?? null, unit)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
