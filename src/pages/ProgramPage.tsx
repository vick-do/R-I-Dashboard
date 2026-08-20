import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDimensions, useProgramSummary } from '../hooks/useData';
import { errorMessage, isApiError, type Dimension, type MetricSummary } from '../lib/api';
import { formatValue, humanise, shortPeriod } from '../lib/format';
import { seriesColor } from '../lib/chart';
import { useAuth } from '../lib/auth';
import { usePeriod } from '../lib/period';
import { PageHeader } from '../components/layout/DashboardLayout';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { FilterSelect } from '../components/ui/FilterSelect';
import { BarList } from '../components/charts/BarList';
import { DonutChart } from '../components/charts/DonutChart';
import { TrendLine } from '../components/charts/TrendLine';
import { RecordFigureDialog } from '../components/entry/RecordFigureDialog';

const CATEGORY_LABELS: Record<string, string> = {
  people: 'People',
  enterprise: 'Enterprise',
  investment: 'Investment',
  social: 'Reach & engagement',
  other: 'Other',
};

const CATEGORY_ORDER = ['people', 'enterprise', 'investment', 'social', 'other'];

/**
 * One page template for every programme. Content is generated from what the data contains, so
 * every navigation destination renders without a component each.
 */
export function ProgramPage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const { year } = usePeriod();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [recording, setRecording] = useState(false);
  const { can } = useAuth();

  const summary = useProgramSummary(pageKey, year);
  const { data: dimensions = [] } = useDimensions();
  const labels = useMemo(() => buildLabelIndex(dimensions), [dimensions]);

  const metrics = summary.data?.metrics ?? [];

  // Reset when the programme or period changes, so the selection can never
  // point at a metric that is no longer present.
  useEffect(() => {
    if (metrics.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (selectedKey && metrics.some((m) => m.key === selectedKey)) return;
    const lead = metrics.find((m) => detailCount(m) > 0) ?? metrics[0];
    setSelectedKey(lead.key);
    setCategory(lead.category ?? 'other');
  }, [pageKey, year, metrics.map((m) => m.key).join('|')]);

  const groups = useMemo(() => {
    const byCategory = new Map<string, MetricSummary[]>();
    for (const metric of metrics) {
      const key = metric.category ?? 'other';
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(metric);
    }
    return [...byCategory.entries()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0])
    );
  }, [metrics]);

  const visible = useMemo(
    () => (category === 'all' || !category ? metrics : metrics.filter((m) => (m.category ?? 'other') === category)),
    [metrics, category]
  );

  if (summary.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-80" />
        <div className="grid grid-cols-2 gap-card-gap sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
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

  const { program, rolledUp } = summary.data!;
  const selected = metrics.find((m) => m.key === selectedKey) ?? null;
  const canEdit = can('editor');

  return (
    <div className="space-y-8">
      <PageHeader
        title={program.name}
        subtitle={
          program.description ??
          (rolledUp
            ? 'Combined figures for every programme in this group'
            : 'Recorded impact figures for this programme')
        }
        actions={
          canEdit && !rolledUp ? (
            <Button variant="primary" onClick={() => setRecording(true)}>
              Record a figure
            </Button>
          ) : null
        }
      />

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
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-section-header text-on-surface">Figures</h2>
              {groups.length > 1 ? (
                <FilterSelect
                  id="metric-category"
                  label="Showing"
                  value={category}
                  onChange={(next) => {
                    setCategory(next);
                    // Keep the charts below in step with what is on screen.
                    const inGroup = metrics.filter((m) => next === 'all' || (m.category ?? 'other') === next);
                    const lead = inGroup.find((m) => detailCount(m) > 0) ?? inGroup[0];
                    if (lead) setSelectedKey(lead.key);
                  }}
                  options={[
                    { value: 'all', label: 'All figures', count: metrics.length },
                    ...groups.map(([key, group]) => ({
                      value: key,
                      label: CATEGORY_LABELS[key] ?? humanise(key),
                      count: group.length,
                    })),
                  ]}
                />
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-card-gap sm:grid-cols-3 xl:grid-cols-5">
              {visible.map((metric) => (
                <MetricCard
                  key={metric.key}
                  metric={metric}
                  labels={labels}
                  selected={metric.key === selectedKey}
                  hasDetail={detailCount(metric) > 0}
                  onSelect={() => setSelectedKey(metric.key)}
                />
              ))}
            </div>

            {visible.length > 1 ? (
              <p className="text-secondary-text text-on-surface-muted">
                Select a figure to see how it breaks down.
              </p>
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

function detailCount(metric: MetricSummary) {
  return metric.breakdowns.length + (metric.trend?.rows.length ? 1 : 0);
}

function MetricCard({
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
  const derived = metric.basis === 'derived_from_breakdown';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={!hasDetail}
      title={hasDetail ? `Show how ${metric.label} breaks down` : 'Only an overall figure is recorded'}
      className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition ${
        selected ? 'border-primary bg-primary-container' : 'border-outline-variant bg-surface-container-lowest'
      } ${hasDetail ? 'hover:border-outline' : 'cursor-default'}`}
    >
      <span className="min-h-[2rem] text-label-caps uppercase leading-tight text-on-surface-muted">
        {metric.label}
      </span>
      <span
        className={`text-[22px] font-semibold leading-none tracking-tight ${
          selected ? 'text-on-primary-container' : 'text-on-surface'
        }`}
      >
        {metric.total === null ? '—' : formatValue(metric.total, metric.unit)}
      </span>
      {derived ? (
        <span
          className="text-xs leading-snug text-on-surface-muted"
          title={`Summed across ${metric.derivedFrom?.map((d) => labels.dimensionLabel(d).toLowerCase()).join(' × ')}`}
        >
          summed
        </span>
      ) : null}
    </button>
  );
}

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

  // A breakdown along the dimension the trend already splits by shows the same
  // numbers with time collapsed out.
  const breakdowns = metric.breakdowns.filter((b) => !(hasTrend && b.dimension === metric.trend?.groupBy));

  if (!hasTrend && breakdowns.length === 0) {
    return (
      <Card>
        <EmptyState
          title={`${metric.label} has no breakdown recorded`}
          hint="Only an overall figure exists. Record it by hub, gender, or another breakdown to see it split out here."
        />
      </Card>
    );
  }

  return (
    <section aria-label={`${metric.label} detail`} className="space-y-card-gap">
      {hasTrend ? <TrendPanel metric={metric} labels={labels} /> : null}

      {breakdowns.length > 0 ? (
        <div className={`grid grid-cols-1 items-start gap-card-gap ${breakdowns.length > 1 ? 'xl:grid-cols-2' : ''}`}>
          {breakdowns.map((breakdown) => (
            <BreakdownPanel
              key={`${metric.key}-${breakdown.dimension}`}
              metric={metric}
              dimension={breakdown.dimension}
              rows={breakdown.rows}
              labels={labels}
              year={year}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The form is chosen from the dimension itself, not from its position on the page.
 */
function BreakdownPanel({
  metric,
  dimension,
  rows,
  labels,
  year,
}: {
  metric: MetricSummary;
  dimension: string;
  rows: MetricSummary['breakdowns'][number]['rows'];
  labels: LabelIndex;
  year: number | undefined;
}) {
  const data = rows
    .map((row) => ({
      name: labels.valueLabel(dimension, row.dimensions[dimension]),
      value: row.value,
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, r) => sum + r.value, 0);
  const dimensionLabel = labels.dimensionLabel(dimension);
  const asComposition = labels.isClosed(dimension) && data.length <= 6 && metric.aggregation === 'sum';

  return (
    <Panel
      title={`${metric.label} by ${dimensionLabel.toLowerCase()}`}
      subtitle={`${formatValue(total, metric.unit)} total${year ? ` in ${year}` : ''}`}
      table={{
        columns: [
          { key: 'name', label: dimensionLabel },
          { key: 'value', label: metric.label, align: 'right' },
          { key: 'share', label: 'Share', align: 'right' },
        ],
        rows: data.map((r) => ({
          name: r.name,
          value: formatValue(r.value, metric.unit),
          share: total ? `${((r.value / total) * 100).toFixed(1)}%` : '—',
        })),
      }}
    >
      {asComposition ? (
        <DonutChart slices={data} unit={metric.unit} centerLabel={dimensionLabel.toLowerCase()} />
      ) : (
        <BarList rows={data} unit={metric.unit} scale="max" />
      )}
    </Panel>
  );
}

function TrendPanel({ metric, labels }: { metric: MetricSummary; labels: LabelIndex }) {
  const trend = metric.trend!;
  const groupBy = trend.groupBy;

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

  // Colour follows the entity, not its rank in this chart: the slot comes from
  // the dimension catalog's ordering, so a channel keeps one colour everywhere.
  const allSeries = [...seen.values()]
    .map((s) => ({ ...s, slot: groupBy ? labels.valueSlot(groupBy, s.slug) : 0 }))
    .sort((a, b) => a.slot - b.slot);

  const shown = allSeries.slice(0, 7);
  const seriesKeys = shown.map((s) => ({ key: s.label, label: s.label, color: seriesColor(s.slot) }));

  return (
    <Panel
      title={`${metric.label} over time`}
      subtitle={groupBy ? `By ${labels.dimensionLabel(groupBy).toLowerCase()}, per month` : 'Per month'}
      action={
        seriesKeys.length > 1 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {seriesKeys.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-secondary-text text-on-surface-variant">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : undefined
      }
      table={{
        columns: [
          { key: 'fullPeriod', label: 'Period' },
          ...allSeries.map((s) => ({ key: s.label, label: s.label, align: 'right' as const })),
        ],
        rows: data.map((point) => ({
          fullPeriod: String(point.fullPeriod ?? point.period),
          ...Object.fromEntries(
            allSeries.map((s) => [
              s.label,
              point[s.label] === undefined ? '—' : formatValue(point[s.label] as number, metric.unit),
            ])
          ),
        })),
      }}
    >
      <TrendLine data={data} seriesKeys={seriesKeys} unit={metric.unit} />

      {allSeries.length > shown.length ? (
        <p className="mt-4 border-t border-outline-variant pt-4 text-secondary-text text-on-surface-variant">
          {allSeries.length - shown.length} further series are in the table view. Past seven, an extra hue is
          indistinguishable from one already in use.
        </p>
      ) : null}
    </Panel>
  );
}

type LabelIndex = {
  dimensionLabel: (name: string) => string;
  valueLabel: (dimension: string, value: string | undefined) => string;
  valueSlot: (dimension: string, value: string | undefined) => number;
  isClosed: (dimension: string) => boolean;
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
    isClosed: (dimension) => byName.get(dimension)?.isClosed ?? false,
  };
}
