import type { Basis, Delta, Unit } from '../../lib/api';
import { formatValue } from '../../lib/format';
import { Sparkline } from './Sparkline';
import { WarningIcon } from './Icons';

/**
 * A single headline figure.
 */
export function StatTile({
  label,
  value,
  unit = 'count',
  detail,
  basis,
  delta,
  series = [],
  description,
  onRecord,
  warning,
}: {
  label: string;
  value: number | null;
  unit?: Unit;
  detail?: string;
  basis?: Basis;
  delta?: Delta | null;
  series?: Array<{ year: number; value: number }>;
  description?: string | null;
  /** Shown to editors when the figure has never been recorded. */
  onRecord?: () => void;
  /** Set when the metric's own definition is unresolved. */
  warning?: string;
}) {
  const missing = value === null || basis === 'no_data';

  return (
    <div
      className={`flex flex-col rounded-lg border p-card-padding ${
        missing ? 'border-dashed border-outline bg-surface-container-lowest' : 'border-outline-variant bg-surface-container-lowest'
      }`}
    >
      {/* The label reserves two lines whether or not it needs them, so a row of
          tiles keeps one baseline for its figures — "Total no. of businesses
          supported" wraps and "Total jobs created" does not. */}
      <div className="flex min-h-[2rem] items-start justify-between gap-3">
        <span className="text-label-caps uppercase text-on-surface-muted" title={description ?? undefined}>
          {label}
        </span>
        {delta ? <DeltaBadge delta={delta} /> : null}
      </div>

      <div className="mb-3 mt-3 flex items-end justify-between gap-3">
        <span
          className={missing ? 'text-kpi-value text-on-surface-muted' : 'text-kpi-value text-on-surface'}
          aria-label={missing ? 'Not yet recorded' : undefined}
        >
          {missing ? '—' : formatValue(value, unit)}
        </span>
        {series.length > 1 ? (
          <Sparkline
            points={series.map((p) => p.value)}
            label={`${label} from ${series[0].year} to ${series[series.length - 1].year}`}
          />
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
        {warning ? (
          <span className="flex items-center gap-1.5 text-secondary-text text-status-serious">
            <WarningIcon className="h-3.5 w-3.5 shrink-0" />
            {warning}
          </span>
        ) : (
          <span className="text-secondary-text text-on-surface-variant">
            {missing ? 'Not yet recorded' : detail}
          </span>
        )}

        {missing && onRecord ? (
          <button
            type="button"
            onClick={onRecord}
            className="shrink-0 text-secondary-text font-medium text-primary transition hover:text-primary-hover hover:underline"
          >
            Add
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Change against the prior year.
 */
function DeltaBadge({ delta }: { delta: Delta }) {
  const rising = delta.change > 0;
  const flat = delta.change === 0;

  return (
    <span
      className="flex shrink-0 items-center gap-0.5 rounded bg-primary-container px-1.5 py-0.5 text-xs font-semibold text-on-primary-container"
      title={`${delta.fromYear}: ${delta.from.toLocaleString('en-GB')} → ${delta.toYear}: ${delta.to.toLocaleString('en-GB')}`}
    >
      {flat ? null : (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          {rising ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
        </svg>
      )}
      {flat ? 'No change' : `${Math.abs(delta.percent).toFixed(0)}%`}
    </span>
  );
}
