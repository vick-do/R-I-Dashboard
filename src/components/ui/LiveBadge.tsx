import type { LiveStatus } from '../../lib/api';
import { formatDateTime, timeAgo } from '../../lib/format';

/**
 * Says how current these figures are, and only where that is a real question.
 *
 * A page fed by a finished workbook says nothing — there is no "as of" to
 * report about a number that will not change. A page fed by a sheet still being
 * filled in says when it last read that sheet, because the difference between
 * "this is today's figure" and "this is last night's" is the difference between
 * a figure you can quote and one you cannot.
 */
export function LiveBadge({ live }: { live: LiveStatus | null }) {
  if (!live) return null;

  const failed = live.status === 'failed';
  const held = live.status === 'needs_review';

  const detail = failed
    ? 'Could not reach the sheet — showing the last figures read from it'
    : held
      ? 'The latest read is held for review, so these are the last approved figures'
      : live.syncedAt
        ? `Read from ${live.sources.map((s) => s.trim()).join(', ')} ${timeAgo(live.syncedAt)}`
        : 'Not yet read from the sheet';

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-3 py-1 text-secondary-text text-on-surface-variant"
      title={
        live.syncedAt
          ? `Last read ${formatDateTime(live.syncedAt)}. Re-read on view when more than ${live.everyMinutes} minutes old.`
          : undefined
      }
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${
          failed ? 'bg-status-danger' : held ? 'bg-status-warning' : 'bg-status-success'
        }`}
      />
      {detail}
      {live.pending ? ' · refreshing' : null}
    </span>
  );
}
