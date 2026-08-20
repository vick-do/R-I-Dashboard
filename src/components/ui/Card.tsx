import type { ReactNode } from 'react';

/**
 * The surface every panel sits on: white, hairline border, no shadow.
 * Shadow is reserved for things that genuinely float — drawer, dialog, tooltip.
 */
export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag className={`rounded-lg border border-outline-variant bg-surface-container-lowest ${className}`}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-card-padding pb-4 pt-card-padding">
      <div className="min-w-0">
        <h2 className="text-card-title text-on-surface">{title}</h2>
        {subtitle ? <p className="mt-1 text-secondary-text text-on-surface-variant">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-card-padding py-12 text-center">
      <p className="text-body-text font-medium text-on-surface-variant">{title}</p>
      {hint ? <p className="max-w-sm text-secondary-text text-on-surface-muted">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 px-card-padding py-12 text-body-text text-on-surface-muted"
      role="status"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-outline border-t-primary" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-card-padding py-10 text-center">
      <p className="text-body-text text-on-surface">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-outline-variant px-3 py-1.5 text-secondary-text font-medium text-on-surface transition hover:bg-surface-variant"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** Skeleton block used while a panel's data is in flight. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-variant ${className}`} />;
}
