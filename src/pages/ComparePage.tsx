import { useState } from 'react';
import { useCompare, useMetrics } from '../hooks/useData';
import { errorMessage } from '../lib/api';
import { formatValue } from '../lib/format';
import { usePeriod } from '../lib/period';
import { PageHeader } from '../components/layout/DashboardLayout';
import { Card, EmptyState, ErrorState, Spinner } from '../components/ui/Card';
import { Panel } from '../components/ui/Panel';
import { BarList } from '../components/charts/BarList';

/**
 * One metric, every programme, ranked.
 */
export function ComparePage() {
  const { year } = usePeriod();
  const [metricKey, setMetricKey] = useState('learners_total');

  const { data: metrics = [] } = useMetrics();
  const compare = useCompare(metricKey, year);

  // Only metrics that roll up across programmes are worth comparing; the rest
  // belong to one programme and would rank a single bar against nothing.
  const comparable = metrics.filter((m) => m.headlineOrder !== null || m.category === 'people');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare programmes"
        subtitle="One metric across every programme that reports it"
        actions={
          <label className="flex items-center gap-2">
            <span className="text-secondary-text text-on-surface-variant">Metric</span>
            <select
              value={metricKey}
              onChange={(event) => setMetricKey(event.target.value)}
              className="rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-text text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {comparable.map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.headlineLabel ?? metric.label}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {compare.isLoading ? (
        <Card>
          <Spinner label="Loading comparison" />
        </Card>
      ) : compare.isError ? (
        <Card>
          <ErrorState message={errorMessage(compare.error)} onRetry={() => void compare.refetch()} />
        </Card>
      ) : compare.data!.rows.length === 0 ? (
        <Card>
          <EmptyState
            title={`Nothing recorded for ${compare.data!.metric.label}`}
            hint={
              year
                ? `No programme has recorded this metric for ${year}. Try another period.`
                : 'No programme has recorded this metric yet.'
            }
          />
        </Card>
      ) : (
        <Panel
          title={compare.data!.metric.label}
          subtitle={`${year ?? 'All time'} · ${formatValue(compare.data!.total, compare.data!.metric.unit)} across ${
            compare.data!.rows.length
          } programme${compare.data!.rows.length === 1 ? '' : 's'}`}
          table={{
            columns: [
              { key: 'name', label: 'Programme' },
              { key: 'value', label: compare.data!.metric.label, align: 'right' },
              { key: 'share', label: 'Share', align: 'right' },
              { key: 'basis', label: 'Basis' },
            ],
            rows: compare.data!.rows.map((row) => ({
              name: row.name,
              value: formatValue(row.value, compare.data!.metric.unit),
              share: row.share != null ? `${(row.share * 100).toFixed(1)}%` : '—',
              basis:
                row.basis === 'derived_from_breakdown'
                  ? `Summed across ${(row.derivedFrom ?? []).join(', ') || 'breakdown'}`
                  : 'Recorded total',
            })),
          }}
        >
          <BarList
            scale="total"
            unit={compare.data!.metric.unit}
            rows={compare.data!.rows.map((row) => ({
              name: row.name,
              value: row.value,
              share: row.share,
              derived: row.basis === 'derived_from_breakdown',
            }))}
          />
        </Panel>
      )}
    </div>
  );
}
