import type { Unit } from '../../lib/api';
import { formatValue } from '../../lib/format';

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
  unit?: Unit;
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
