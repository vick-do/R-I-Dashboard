import type { OrgTotal } from '../../lib/api';
import { formatValue } from '../../lib/format';

/**
 * The Overview's seven headline figures.
 *
 * The first figure is the hero — one number the page leads with, at display
 * size. The rest are stat tiles. Figures that have not been measured stay in
 * the grid, greyed and labelled, because removing them would hide the fact that
 * they are unmeasured; "not recorded" and "zero" are different statements.
 */
export function HeadlineGrid({
  totals,
  canEdit,
  onRecord,
}: {
  totals: OrgTotal[];
  canEdit: boolean;
  onRecord?: (metricKey: string) => void;
}) {
  if (totals.length === 0) return null;

  const [hero, ...rest] = totals;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <HeroFigure total={hero} canEdit={canEdit} onRecord={onRecord} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-3">
        {rest.map((total) => (
          <HeadlineTile key={total.key} total={total} canEdit={canEdit} onRecord={onRecord} />
        ))}
      </div>
    </div>
  );
}

function HeroFigure({
  total,
  canEdit,
  onRecord,
}: {
  total: OrgTotal;
  canEdit: boolean;
  onRecord?: (metricKey: string) => void;
}) {
  const missing = total.value === null;

  return (
    <div className="flex flex-col justify-between rounded-xl bg-brand p-6 text-white shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">{total.label}</p>

      <p className="mt-4 text-5xl font-extrabold leading-none tracking-tight">
        {missing ? <span className="text-3xl font-bold text-white/60">Not yet recorded</span> : formatValue(total.value, total.unit)}
      </p>

      <p className="mt-4 text-xs text-white/80">
        {missing
          ? 'No figures recorded for this metric.'
          : `Across ${total.programCount} programme${total.programCount === 1 ? '' : 's'}${
              total.basis === 'partly_derived' ? ' · partly summed from breakdowns' : ''
            }`}
      </p>

      {missing && canEdit ? (
        <button
          type="button"
          onClick={() => onRecord?.(total.key)}
          className="mt-3 self-start rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
        >
          Record a figure
        </button>
      ) : null}
    </div>
  );
}

function HeadlineTile({
  total,
  canEdit,
  onRecord,
}: {
  total: OrgTotal;
  canEdit: boolean;
  onRecord?: (metricKey: string) => void;
}) {
  const missing = total.value === null;

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl border p-4 shadow-card transition duration-200 ${
        missing ? 'border-dashed border-slate-300 bg-surface-raised' : 'border-slate-200 bg-surface hover:-translate-y-0.5 hover:shadow-soft'
      }`}
    >
      <p className="text-[0.68rem] font-medium uppercase leading-tight tracking-wider text-ink-muted" title={total.description ?? undefined}>
        {total.label}
      </p>

      <p className={`text-2xl font-bold leading-tight ${missing ? 'text-ink-muted' : 'text-ink'}`}>
        {missing ? '—' : formatValue(total.value, total.unit)}
      </p>

      {missing ? (
        canEdit ? (
          <button
            type="button"
            onClick={() => onRecord?.(total.key)}
            className="self-start text-[0.68rem] font-semibold text-brand underline underline-offset-2 transition hover:text-brand-dark"
          >
            Record a figure
          </button>
        ) : (
          <p className="text-[0.68rem] text-ink-muted">Not yet recorded</p>
        )
      ) : (
        <p className="text-[0.68rem] text-ink-secondary">
          {total.basis === 'partly_derived'
            ? `${total.programCount} programmes · partly derived`
            : `Across ${total.programCount} programme${total.programCount === 1 ? '' : 's'}`}
        </p>
      )}
    </div>
  );
}
