import { useState } from 'react';
import { useSheets, useSyncSheet } from '../hooks/useData';
import { errorMessage, type SheetSource } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/layout/DashboardLayout';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConnectSheetDialog } from '../components/entry/ConnectSheetDialog';

const STATUS: Record<SheetSource['lastStatus'], { label: string; className: string }> = {
  synced: { label: 'Synced', className: 'bg-status-success-container text-status-on-success-container' },
  needs_review: { label: 'Held for review', className: 'bg-status-warning-container text-status-on-warning-container' },
  failed: { label: 'Failed', className: 'bg-status-danger-container text-status-on-danger-container' },
  never_run: { label: 'Not yet run', className: 'bg-surface-variant text-on-surface-variant' },
};

/**
 * The Google Sheets the platform reads from.
 */
export function SheetsPage() {
  const sheets = useSheets();
  const sync = useSyncSheet();
  const { can } = useAuth();
  const canEdit = can('editor');
  const [connecting, setConnecting] = useState(false);

  if (sheets.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (sheets.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(sheets.error)} onRetry={() => void sheets.refetch()} />
      </Card>
    );
  }

  const { sources, configured } = sheets.data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connected sheets"
        subtitle="Figures are pulled from Google Sheets and land as reversible import batches"
        actions={
          canEdit && configured ? (
            <Button variant="primary" onClick={() => setConnecting(true)}>
              Connect a sheet
            </Button>
          ) : null
        }
      />

      {!configured ? (
        <Card className="p-card-padding">
          <h2 className="text-card-title text-on-surface">Google Sheets is not connected yet</h2>
          <p className="mt-2 max-w-2xl text-body-text text-on-surface-variant">
            Create a service account in Google Cloud, put its address and private key in the server&rsquo;s
            environment as <code className="rounded bg-surface-variant px-1.5 py-0.5 text-xs">GOOGLE_CLIENT_EMAIL</code>{' '}
            and <code className="rounded bg-surface-variant px-1.5 py-0.5 text-xs">GOOGLE_PRIVATE_KEY</code>, then share
            each spreadsheet with that address. Viewer access is enough — the platform never writes back to a sheet.
          </p>
        </Card>
      ) : null}

      {sources.length === 0 ? (
        <Card>
          <EmptyState
            title="No sheets connected"
            hint="Connect a spreadsheet tab to a programme and its figures will sync on a schedule."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-card-gap">
          {sources.map((source) => {
            const status = STATUS[source.lastStatus];
            return (
              <Card key={source._id} className="flex flex-wrap items-start gap-4 p-card-padding">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-card-title text-on-surface">
                      {source.spreadsheetTitle || 'Untitled spreadsheet'}
                      <span className="font-normal text-on-surface-muted"> › {source.tabName}</span>
                    </h2>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                    {!source.isEnabled ? (
                      <span className="rounded bg-surface-variant px-1.5 py-0.5 text-xs font-semibold text-on-surface-variant">
                        Paused
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 text-body-text text-on-surface-variant">
                    Reports on <span className="font-medium text-on-surface">{source.program?.name ?? '—'}</span>
                    {source.lastMessage ? ` · ${source.lastMessage}` : ''}
                  </p>

                  <p className="mt-1 text-secondary-text text-on-surface-muted">
                    {source.lastSyncedAt ? `Last synced ${formatDateTime(source.lastSyncedAt)}` : 'Never synced'} ·{' '}
                    {source.autoCommit
                      ? `Commits automatically when it reconciles and nothing moves more than ${source.maxChangePercent}%`
                      : 'Always held for review'}
                  </p>
                </div>

                {canEdit ? (
                  <Button
                    variant="secondary"
                    disabled={sync.isPending}
                    onClick={() => sync.mutate(source._id)}
                  >
                    {sync.isPending ? 'Syncing…' : 'Sync now'}
                  </Button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {sync.isError ? (
        <p
          role="alert"
          className="rounded-md border border-status-danger/30 bg-status-danger-container px-3 py-2 text-secondary-text text-status-on-danger-container"
        >
          {errorMessage(sync.error)}
        </p>
      ) : null}

      <ConnectSheetDialog open={connecting} onClose={() => setConnecting(false)} />
    </div>
  );
}
