/**
 * Period filter. Sits in one row above the charts, per the interaction spec.
 *
 * Only years that actually have data are offered, so the control can never
 * put the page into an empty state the data could never fill.
 */
export function PeriodSelector({
  years,
  value,
  onChange,
}: {
  years: number[];
  value: number | undefined;
  onChange: (year: number | undefined) => void;
}) {
  if (years.length === 0) return null;

  const options: Array<{ label: string; year: number | undefined }> = [
    { label: 'All time', year: undefined },
    ...years.map((year) => ({ label: String(year), year })),
  ];

  return (
    <div className="no-print inline-flex rounded-lg border border-slate-300 bg-surface p-0.5" role="group" aria-label="Period">
      {options.map((option) => {
        const isActive = option.year === value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.year)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              isActive ? 'bg-brand text-white' : 'text-ink-secondary hover:bg-slate-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
