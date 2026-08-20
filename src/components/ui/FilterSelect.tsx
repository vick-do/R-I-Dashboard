import { selectClass } from './Field';

export type FilterOption = { value: string; label: string; count?: number };

/**
 * The filter that keeps a long list readable.
 *
 * Counts sit in the option text rather than beside the control, so choosing is
 * one glance: you can see how much is behind each choice before making it, and
 * that a group you are not looking at is not empty.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  id: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-secondary-text text-on-surface-variant">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${selectClass} w-auto min-w-[13rem]`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.count === undefined ? '' : ` (${option.count})`}
          </option>
        ))}
      </select>
    </div>
  );
}
