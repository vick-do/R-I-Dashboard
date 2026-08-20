import type { ReactNode } from 'react';

/**
 * Form control styling, defined once.
 */
export const inputClass =
  'h-9 w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-body-text text-on-surface outline-none transition placeholder:text-on-surface-muted focus:border-primary focus:ring-2 focus:ring-primary/30';

export const selectClass = `${inputClass} pr-8`;

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-secondary-text font-medium text-on-surface">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-snug text-on-surface-muted">{hint}</p> : null}
    </div>
  );
}
