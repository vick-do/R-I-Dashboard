import { useMemo, useState } from 'react';
import { useDimensions, useOrgTotals, useProgramSummary } from '../hooks/useData';
import { errorMessage } from '../lib/api';
import { formatValue, humanise } from '../lib/format';
import { seriesColor } from '../lib/chart';
import { useAuth } from '../lib/auth';
import { HeadlineGrid } from '../components/ui/HeadlineGrid';
import { PeriodSelector } from '../components/ui/PeriodSelector';
import { Card, ErrorState, Spinner } from '../components/ui/Card';
import { ChartFrame } from '../components/charts/ChartFrame';
import { BreakdownBar } from '../components/charts/BreakdownBar';
import { RecordFigureDialog } from '../components/entry/RecordFigureDialog';

/**
 * Pan-African overview: the seven figures MEST reports on, in reporting order.
 *
 * Every value is calculated by the API from recorded facts. A metric with
 * nothing recorded shows as such rather than as zero, and — for editors — links
 * straight to the form that records it.
 */
export function OverviewPage() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [recording, setRecording] = useState<string | null>(null);
  const { can } = useAuth();

  const totals = useOrgTotals(year);
  const mestX = useProgramSummary('mest-x', year);

  const years = mestX.data?.availableYears ?? [];
  const canEdit = can('editor');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pan-African Impact Overview</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Every figure is calculated from recorded data. Nothing here is typed in by hand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector years={years} value={year} onChange={setYear} />
          {canEdit ? (
            <button
              type="button"
              onClick={() => setRecording('')}
              className="no-print rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
            >
              Record figure
            </button>
          ) : null}
        </div>
      </header>

      {totals.isLoading ? (
        <Card>
          <Spinner label="Loading impact figures" />
        </Card>
      ) : totals.isError ? (
        <Card>
          <ErrorState message={errorMessage(totals.error)} onRetry={() => void totals.refetch()} />
        </Card>
      ) : (
        <HeadlineGrid
          totals={totals.data ?? []}
          canEdit={canEdit}
          onRecord={(metricKey) => setRecording(metricKey)}
        />
      )}

      <HubComparison summary={mestX} year={year} />

      <RecordFigureDialog
        open={recording !== null}
        onClose={() => setRecording(null)}
        initialMetric={recording || undefined}
      />
    </div>
  );
}

/** Where the trained figure comes from, as the Overview's single supporting chart. */
function HubComparison({
  summary,
  year,
}: {
  summary: ReturnType<typeof useProgramSummary>;
  year: number | undefined;
}) {
  // Labels come from the dimension catalog rather than being reconstructed from
  // the slug, so the hub reads "Woman's Haven Africa" exactly as it does on the
  // programme pages.
  const { data: dimensions = [] } = useDimensions();
  const hubLabels = useMemo(() => {
    const hub = dimensions.find((d) => d.name === 'hub');
    return new Map((hub?.values ?? []).map((v) => [v.value, v.label]));
  }, [dimensions]);

  if (summary.isLoading) {
    return (
      <Card>
        <Spinner label="Loading hub breakdown" />
      </Card>
    );
  }

  if (summary.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(summary.error)} onRetry={() => void summary.refetch()} />
      </Card>
    );
  }

  const learners = summary.data?.metrics.find((m) => m.key === 'learners_total');
  const byHub = learners?.breakdowns.find((b) => b.dimension === 'hub');
  if (!byHub || byHub.rows.length === 0) return null;

  const data = byHub.rows
    .map((row) => ({
      name: hubLabels.get(row.dimensions.hub) ?? humanise(row.dimensions.hub ?? 'unspecified'),
      value: row.value,
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartFrame
      title="Learners trained by hub"
      subtitle={`${formatValue(total)} learners${year ? ` in ${year}` : ' across all periods'}`}
      columns={[
        { key: 'name', label: 'Hub' },
        { key: 'value', label: 'Learners', align: 'right' },
        { key: 'share', label: 'Share', align: 'right' },
      ]}
      rows={data.map((d) => ({
        name: d.name,
        value: d.value,
        share: `${((d.value / total) * 100).toFixed(1)}%`,
      }))}
      series={[{ label: 'Learners trained', color: seriesColor(0) }]}
    >
      <BreakdownBar data={data} />
    </ChartFrame>
  );
}
