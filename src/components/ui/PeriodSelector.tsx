/**
 * Period filter. Sits in one row above the charts, per the interaction spec.
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
    <div
      className="no-print inline-flex rounded-md border border-outline-variant bg-surface-container-lowest p-0.5"
      role="group"
      aria-label="Period"
    >
      {options.map((option) => {
        const isActive = option.year === value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.year)}
            className={`rounded px-3 py-1.5 text-secondary-text font-medium transition ${
              isActive
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
