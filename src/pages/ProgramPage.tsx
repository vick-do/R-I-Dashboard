import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDimensions, useProgramSummary } from '../hooks/useData';
import { errorMessage, isApiError, type Dimension, type MetricSummary } from '../lib/api';
import { formatValue, humanise, shortPeriod } from '../lib/format';
import { seriesColor } from '../lib/chart';
import { useAuth } from '../lib/auth';
import { PeriodSelector } from '../components/ui/PeriodSelector';
import { Card, EmptyState, ErrorState, Spinner } from '../components/ui/Card';
import { ChartFrame } from '../components/charts/ChartFrame';
import { BreakdownBar } from '../components/charts/BreakdownBar';
import { TrendLine } from '../components/charts/TrendLine';
import { RecordFigureDialog } from '../components/entry/RecordFigureDialog';

/**
 * One page template for every programme.
 *
 * Content is generated from what the data contains, so all 24 previously
 * stubbed navigation destinations render without a component each.
 *
 * The figures act as the metric picker and only the selected metric is charted.
 * Rendering every metric's trend and every breakdown at once produced eighteen
 * stacked charts on EdTech Mondays — technically complete and practically
 * unreadable. The numbers stay visible together; the detail is one click away.
 */
export function ProgramPage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const [year, setYear] = useState<number | undefined>(undefined);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const { can } = useAuth();

  const summary = useProgramSummary(pageKey, year);
  const { data: dimensions = [] } = useDimensions();
  const labels = useMemo(() => buildLabelIndex(dimensions), [dimensions]);

  const metrics = summary.data?.metrics ?? [];

  // Default to the metric with the most to show, and reset when the programme
  // or period changes so the selection can never point at a missing metric.
  useEffect(() => {
    if (metrics.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (selectedKey && metrics.some((m) => m.key === selectedKey)) return;
    // The API returns metrics in the catalog's display order, so the first one
    // with something to show is the intended lead figure.
    const lead = metrics.find((m) => detailCount(m) > 0) ?? metrics[0];
    setSelectedKey(lead.key);
  }, [pageKey, year, metrics.map((m) => m.key).join('|')]);

  if (summary.isLoading) {
    return (
      <Card>
        <Spinner label="Loading programme" />
      </Card>
    );
  }

  if (summary.isError) {
    const notFound = isApiError(summary.error) && summary.error.status === 404;
    return (
      <Card>
        <ErrorState
          message={notFound ? 'That programme does not exist.' : errorMessage(summary.error)}
          onRetry={notFound ? undefined : () => void summary.refetch()}
        />
      </Card>
    );
  }

  const { program, availableYears, rolledUp } = summary.data!;
  const selected = metrics.find((m) => m.key === selectedKey) ?? null;
  const canEdit = can('editor');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink">{program.name}</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {program.description ??
              (rolledUp
                ? 'Combined figures for every programme in this group.'
                : 'Recorded impact figures for this programme.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector years={availableYears} value={year} onChange={setYear} />
          {canEdit && !rolledUp ? (
            <button
              type="button"
              onClick={() => setRecording(true)}
              className="no-print rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
            >
              Record figure
            </button>
          ) : null}
        </div>
      </header>

      {metrics.length === 0 ? (
        <Card>
          <EmptyState
            title={year ? `No data recorded for ${year}` : 'No data recorded yet'}
            hint={
              year
                ? 'Try another period, or import the workbook covering this year.'
                : 'Record a figure or import a workbook to see this programme’s impact here.'
            }
          />
        </Card>
      ) : (
        <>
          <section aria-label="Figures">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {metrics.map((metric) => (
                <MetricChip
                  key={metric.key}
                  metric={metric}
                  labels={labels}
                  selected={metric.key === selectedKey}
                  hasDetail={detailCount(metric) > 0}
                  onSelect={() => setSelectedKey(metric.key)}
                />
              ))}
            </div>
            {metrics.length > 1 ? (
              <p className="mt-2 text-xs text-ink-muted">Select a figure to see how it breaks down.</p>
            ) : null}
          </section>

          {selected ? <MetricDetail metric={selected} labels={labels} year={year} /> : null}
        </>
      )}

      <RecordFigureDialog
        open={recording}
        onClose={() => setRecording(false)}
        initialProgram={program.pageKey}
        initialMetric={selectedKey ?? undefined}
      />
    </div>
  );
}

/** How much detail a metric can show — used to pick a sensible default. */
function detailCount(metric: MetricSummary) {
  return metric.breakdowns.length + (metric.trend?.rows.length ? 1 : 0);
}

function MetricChip({
  metric,
  labels,
  selected,
  hasDetail,
  onSelect,
}: {
  metric: MetricSummary;
  labels: LabelIndex;
  selected: boolean;
  hasDetail: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={!hasDetail}
      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-brand bg-brand-tint shadow-card'
          : 'border-slate-200 bg-surface shadow-card hover:border-slate-300'
      } ${hasDetail ? '' : 'cursor-default opacity-90'}`}
    >
      <span className="text-[0.65rem] font-medium uppercase leading-tight tracking-wider text-ink-muted">
        {metric.label}
      </span>
      <span className={`text-xl font-bold leading-tight ${selected ? 'text-brand-dark' : 'text-ink'}`}>
        {metric.total === null ? '—' : formatValue(metric.total, metric.unit)}
      </span>
      {metric.basis === 'derived_from_breakdown' ? (
        <span className="text-[0.62rem] leading-tight text-ink-muted">
          summed across {metric.derivedFrom?.map((d) => labels.dimensionLabel(d).toLowerCase()).join(' × ')}
        </span>
      ) : null}
    </button>
  );
}

/** Trend and breakdowns for the one selected metric. */
function MetricDetail({
  metric,
  labels,
  year,
}: {
  metric: MetricSummary;
  labels: LabelIndex;
  year: number | undefined;
}) {
  const hasTrend = Boolean(metric.trend && metric.trend.rows.length > 0);

  // A breakdown along the dimension the trend is already split by shows the
  // same numbers with time collapsed out, so it is dropped as redundant.
  const breakdowns = metric.breakdowns.filter(
    (b) => !(hasTrend && b.dimension === metric.trend?.groupBy)
  );

  if (!hasTrend && breakdowns.length === 0) {
    return (
      <Card>
        <EmptyState
          title={`${metric.label} has no breakdown recorded`}
          hint="Only an overall figure exists for this metric. Record it by hub, gender, or another breakdown to see it split out here."
        />
      </Card>
    );
  }

  return (
    <section aria-label={`${metric.label} detail`} className="space-y-4">
      {hasTrend ? <TrendCard metric={metric} labels={labels} /> : null}

      {breakdowns.length > 0 ? (
        <div className={`grid grid-cols-1 gap-4 ${breakdowns.length > 1 ? 'xl:grid-cols-2' : ''}`}>
          {breakdowns.map((breakdown) => {
            const data = breakdown.rows
              .map((row) => ({
                name: labels.valueLabel(breakdown.dimension, row.dimensions[breakdown.dimension]),
                value: row.value,
              }))
              .sort((a, b) => b.value - a.value);

            const total = data.reduce((sum, d) => sum + d.value, 0);

            return (
              <ChartFrame
                key={`${metric.key}-${breakdown.dimension}`}
                title={`${metric.label} by ${labels.dimensionLabel(breakdown.dimension).toLowerCase()}`}
                subtitle={`${formatValue(total, metric.unit)} total${year ? ` in ${year}` : ''}`}
                series={[{ label: metric.label, color: seriesColor(0) }]}
                columns={[
                  { key: 'name', label: labels.dimensionLabel(breakdown.dimension) },
                  { key: 'value', label: metric.label, unit: metric.unit, align: 'right' },
                  { key: 'share', label: 'Share', align: 'right' },
                ]}
                rows={data.map((d) => ({
                  name: d.name,
                  value: d.value,
                  share: total ? `${((d.value / total) * 100).toFixed(1)}%` : '—',
                }))}
              >
                <BreakdownBar data={data} unit={metric.unit} />
              </ChartFrame>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function TrendCard({ metric, labels }: { metric: MetricSummary; labels: LabelIndex }) {
  const trend = metric.trend!;
  const groupBy = trend.groupBy;

  // Pivot the API's long rows into one object per period, one key per series.
  const periods = new Map<string, Record<string, string | number>>();
  const seen = new Map<string, { slug: string; label: string }>();

  for (const row of trend.rows) {
    const period = row.periodLabel ?? '';
    const slug = groupBy ? (row.dimensions[groupBy] ?? 'unspecified') : metric.key;
    const label = groupBy ? labels.valueLabel(groupBy, row.dimensions[groupBy]) : metric.label;
    seen.set(slug, { slug, label });

    const existing = periods.get(period) ?? { period: shortPeriod(period), fullPeriod: period };
    existing[label] = row.value;
    periods.set(period, existing);
  }

  const uniquePeriods = [
    ...new Set(
      [...trend.rows]
        .sort((a, b) => new Date(a.periodStart ?? 0).getTime() - new Date(b.periodStart ?? 0).getTime())
        .map((row) => row.periodLabel ?? '')
    ),
  ];

  const data = uniquePeriods.map((period) => periods.get(period)!) as Array<
    { period: string } & Record<string, string | number>
  >;

  // Colour follows the entity, not its rank in this chart. The slot comes from
  // the dimension catalog's ordering, so a channel keeps one colour across
  // every chart on the page.
  const allSeries = [...seen.values()]
    .map((s) => ({ ...s, slot: groupBy ? labels.valueSlot(groupBy, s.slug) : 0 }))
    .sort((a, b) => a.slot - b.slot);

  // Three validated slots; the tail folds into the table rather than inventing
  // a fourth hue.
  const shown = allSeries.slice(0, 3);
  const seriesKeys = shown.map((s) => ({ key: s.label, label: s.label, color: seriesColor(s.slot) }));

  return (
    <ChartFrame
      title={`${metric.label} over time`}
      subtitle={groupBy ? `By ${labels.dimensionLabel(groupBy).toLowerCase()}, per month` : 'Per month'}
      series={seriesKeys.map((s) => ({ label: s.label, color: s.color }))}
      columns={[
        { key: 'fullPeriod', label: 'Period' },
        ...allSeries.map((s) => ({ key: s.label, label: s.label, unit: metric.unit, align: 'right' as const })),
      ]}
      rows={data.map((point) => ({
        fullPeriod: String(point.fullPeriod ?? point.period),
        ...Object.fromEntries(allSeries.map((s) => [s.label, (point[s.label] as number) ?? null])),
      }))}
      footnote={
        allSeries.length > shown.length
          ? `${allSeries.length - shown.length} further series are in the table view but not the chart.`
          : undefined
      }
    >
      <TrendLine data={data} seriesKeys={seriesKeys} unit={metric.unit} />
    </ChartFrame>
  );
}

// ------------------------------------------------------------- labels

type LabelIndex = {
  dimensionLabel: (name: string) => string;
  valueLabel: (dimension: string, value: string | undefined) => string;
  /** Stable colour slot for a dimension value, from the catalog's own order. */
  valueSlot: (dimension: string, value: string | undefined) => number;
};

function buildLabelIndex(dimensions: Dimension[]): LabelIndex {
  const byName = new Map(dimensions.map((d) => [d.name, d]));

  const sortedValues = (dimension: string) =>
    [...(byName.get(dimension)?.values ?? [])].sort((a, b) => a.order - b.order);

  return {
    dimensionLabel: (name) => byName.get(name)?.label ?? humanise(name),
    valueLabel: (dimension, value) => {
      if (!value) return 'Unspecified';
      const match = byName.get(dimension)?.values.find((v) => v.value === value);
      return match?.label ?? humanise(value);
    },
    valueSlot: (dimension, value) => {
      if (!value) return 0;
      const index = sortedValues(dimension).findIndex((v) => v.value === value);
      return index === -1 ? 0 : index;
    },
  };
}
