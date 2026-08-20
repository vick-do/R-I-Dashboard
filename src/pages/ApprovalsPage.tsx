import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubmissions, useReviewSubmission } from '../hooks/useData';
import { errorMessage, type HeldBatch, type Submission } from '../lib/api';
import { formatValue, formatDateTime, humanise } from '../lib/format';
import { PageHeader } from '../components/layout/DashboardLayout';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { inputClass } from '../components/ui/Field';
import { WarningIcon } from '../components/ui/Icons';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'returned', label: 'Returned' },
  { key: 'approved', label: 'Approved' },
] as const;

/**
 * Figures proposed by editors, waiting on a reviewer.
 */
export function ApprovalsPage() {
  const [status, setStatus] = useState<'pending' | 'returned' | 'approved'>('pending');
  const queue = useSubmissions(status);

  if (queue.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (queue.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(queue.error)} onRetry={() => void queue.refetch()} />
      </Card>
    );
  }

  const { submissions, heldBatches, counts, canReview } = queue.data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        subtitle={
          canReview
            ? 'Figures proposed by editors. Nothing here is live until you publish it.'
            : 'Figures you have proposed. A reviewer publishes them.'
        }
      />

      {canReview ? (
        <div className="grid grid-cols-2 gap-card-gap sm:grid-cols-3">
          <Stat label="Awaiting you" value={counts.pending} emphasis={counts.pending > 0} />
          <Stat label="Returned" value={counts.returned} />
          <Stat label="Imports held" value={counts.heldBatches} />
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-outline-variant" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={status === tab.key}
            onClick={() => setStatus(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-body-text font-medium transition ${
              status === tab.key
                ? 'border-primary text-on-surface'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && counts.pending > 0 ? (
              <span className="ml-2 rounded-full bg-primary-container px-1.5 py-0.5 text-xs text-on-primary-container">
                {counts.pending}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {submissions.length === 0 ? (
        <Card>
          <EmptyState
            title={
              status === 'pending'
                ? canReview
                  ? 'Nothing waiting'
                  : 'You have nothing awaiting review'
                : `Nothing ${status}`
            }
            hint={
              status === 'pending'
                ? 'Figures recorded by an editor arrive here before they reach the dashboard.'
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-card-gap">
          {submissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} canReview={canReview} />
          ))}
        </div>
      )}

      {status === 'pending' && canReview && heldBatches.length > 0 ? (
        <>
          <div className="flex items-center gap-3 pt-2">
            <h2 className="text-label-caps uppercase text-on-surface-muted">Imports held for review</h2>
            <div className="h-px flex-1 bg-outline-variant" />
          </div>
          {heldBatches.map((batch) => (
            <HeldBatchCard key={batch.id} batch={batch} />
          ))}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-card-padding">
      <p className="text-label-caps uppercase text-on-surface-muted">{label}</p>
      <p className={`mt-3 text-kpi-value ${emphasis ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
    </div>
  );
}

/**
 * A proposal, with the figure it would replace beside it.
 *
 * "248" means nothing on its own — what a reviewer needs is what it changes and
 * by how much.
 */
function SubmissionCard({ submission, canReview }: { submission: Submission; canReview: boolean }) {
  const { approve, returnIt } = useReviewSubmission();
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const unit = submission.metric?.unit ?? 'count';
  const rising = (submission.change ?? 0) > 0;
  const breakdown = Object.entries(submission.dimensions ?? {});

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="p-card-padding">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-secondary-text text-on-surface-variant">
            <span className="font-medium text-on-surface">
              {submission.submittedBy
                ? `${submission.submittedBy.firstName} ${submission.submittedBy.lastName}`
                : 'Someone'}
            </span>{' '}
            {submission.isFirstValue ? 'proposed a first figure for' : 'proposed a revision to'}{' '}
            <Link
              to={submission.program ? `/p/${submission.program.pageKey}` : '#'}
              className="font-medium text-on-surface hover:underline"
            >
              {submission.program?.name}
            </Link>{' '}
            · {submission.metric?.label} · {submission.periodLabel}
            {breakdown.length > 0
              ? ` · ${breakdown.map(([k, v]) => `${humanise(k)} ${humanise(v)}`).join(', ')}`
              : ''}
          </p>

          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            {submission.currentValue !== null ? (
              <>
                <span className="tnum text-body-text text-on-surface-muted line-through">
                  {formatValue(submission.currentValue, unit)}
                </span>
                <span className="text-on-surface-muted">→</span>
              </>
            ) : null}

            <span className="tnum text-[26px] font-semibold leading-none text-on-surface">
              {formatValue(submission.value, unit)}
            </span>

            {submission.change !== null && submission.change !== 0 ? (
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                  rising
                    ? 'bg-status-success-container text-status-on-success-container'
                    : 'bg-status-danger-container text-status-on-danger-container'
                }`}
              >
                {rising ? '+' : ''}
                {formatValue(submission.change, unit)}
                {submission.percent !== null ? ` · ${Math.abs(submission.percent).toFixed(0)}%` : ''}
              </span>
            ) : null}

            {submission.isFirstValue ? (
              <span className="rounded bg-primary-container px-1.5 py-0.5 text-xs font-semibold text-on-primary-container">
                First value
              </span>
            ) : null}
          </div>

          {submission.note ? (
            <p className="mt-3 border-l-2 border-outline-variant bg-surface px-3 py-2 text-secondary-text italic text-on-surface-variant">
              “{submission.note}”
            </p>
          ) : null}

          {submission.reviewNote ? (
            <p className="mt-3 border-l-2 border-status-serious bg-status-warning-container px-3 py-2 text-secondary-text text-status-on-warning-container">
              Returned by {submission.reviewedBy?.firstName}: “{submission.reviewNote}”
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-secondary-text text-status-on-danger-container">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-secondary-text text-on-surface-muted">
            {formatDateTime(submission.submittedAt)}
          </span>

          {canReview && submission.status === 'pending' ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setReturning((open) => !open)}>
                Return
              </Button>
              <Button
                variant="primary"
                disabled={approve.isPending}
                onClick={() => run(() => approve.mutateAsync(submission.id))}
              >
                {approve.isPending ? 'Publishing…' : 'Approve'}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {returning ? (
        <div className="mt-4 border-t border-outline-variant pt-4">
          <label htmlFor={`note-${submission.id}`} className="text-secondary-text font-medium text-on-surface">
            Why is it going back?
          </label>
          <p className="mt-0.5 text-secondary-text text-on-surface-muted">
            The submitter sees this, so make it something they can act on.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              id={`note-${submission.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. That looks like the cohort figure, not the hub total"
              className={inputClass}
            />
            <Button
              variant="secondary"
              disabled={!note.trim() || returnIt.isPending}
              onClick={() => run(() => returnIt.mutateAsync({ id: submission.id, note }))}
            >
              {returnIt.isPending ? 'Returning…' : 'Send back'}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/** A sheet sync the reconciliation gate stopped. */
function HeldBatchCard({ batch }: { batch: HeldBatch }) {
  return (
    <Card className="flex flex-wrap items-start gap-3 border-l-[3px] border-l-status-serious p-card-padding">
      <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-status-serious" />

      <div className="min-w-0 flex-1">
        <h3 className="text-card-title text-on-surface">
          {batch.fileName}
          <span className="font-normal text-on-surface-muted"> › {batch.sheetName}</span>
        </h3>
        <p className="mt-1 text-secondary-text text-on-surface-variant">
          {batch.program?.name} · held {formatDateTime(batch.createdAt)}
        </p>

        {batch.failedChecks.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {batch.failedChecks.map((check) => (
              <li key={check.label} className="text-secondary-text text-on-surface-variant">
                {check.label} — sheet states {check.expected}, rows sum to {check.actual}
              </li>
            ))}
          </ul>
        ) : null}
        {batch.issues.map((issue) => (
          <p key={issue.message} className="mt-1 text-secondary-text text-on-surface-variant">
            {issue.message}
          </p>
        ))}
      </div>

      <Link
        to="/imports"
        className="shrink-0 rounded-md border border-outline-variant px-3 py-1.5 text-secondary-text font-medium text-on-surface transition hover:bg-surface-variant"
      >
        Open sheet
      </Link>
    </Card>
  );
}
