import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * One button, three weights. Defined once so a primary action looks identical on the Overview,
 * in a dialog, and on a programme page — which is most of what "consistent" means to someone
 * using the thing every day.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover disabled:bg-primary/40',
  secondary:
    'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-variant disabled:text-on-surface-muted',
  ghost: 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface',
  danger:
    'border border-status-danger/30 bg-status-danger-container text-status-on-danger-container hover:border-status-danger/50',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-secondary-text' : 'h-9 px-4 text-body-text';

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${sizing} ${VARIANTS[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
