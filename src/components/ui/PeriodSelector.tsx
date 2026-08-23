import { selectClass } from './Field';

/**
 * The global period filter.
 *
 * A dropdown rather than a segmented control: the year list grows with the data
 * — Grow alone spans 2024, 2025 and 2026 — and a row of buttons that widens
 * every time a year is added eventually crowds the top bar off the screen.
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

  return (
    <label className="no-print flex items-center gap-2">
      <span className="sr-only">Period</span>
      <select
        value={value === undefined ? 'all' : String(value)}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === 'all' ? undefined : Number(next));
        }}
        className={`${selectClass} w-auto min-w-[8.5rem] font-medium`}
        aria-label="Period"
      >
        <option value="all">All time</option>
        {[...years].sort((a, b) => b - a).map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
