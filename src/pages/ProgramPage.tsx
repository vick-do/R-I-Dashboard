import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDimensions, useMetricByYear, useProgramSummary } from '../hooks/useData';
import { errorMessage, isApiError, type Dimension, type MetricSummary } from '../lib/api';
import { formatValue, humanise, shortPeriod } from '../lib/format';
import { canColourByCategory, seriesColor } from '../lib/chart';
import { useAuth } from '../lib/auth';
import { usePeriod } from '../lib/period';
import { PageHeader } from '../components/layout/DashboardLayout';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { FilterSelect } from '../components/ui/FilterSelect';
import { BarList } from '../components/charts/BarList';
import { ColumnChart } from '../components/charts/ColumnChart';
import { DonutChart } from '../components/charts/DonutChart';
import { CompositionBar, CompositionLegend } from '../components/charts/CompositionBar';
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

            <div role="tablist" aria-label="Figures" className="grid grid-cols-2 gap-card-gap sm:grid-cols-3 xl:grid-cols-5">
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

          {selected ? <MetricDetail metric={selected} labels={labels} year={year} pageKey={pageKey} /> : null}
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
      role="tab"
      aria-selected={selected}
      title={hasDetail ? `Show how ${metric.label} breaks down` : 'Only an overall figure is recorded'}
      className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition hover:border-outline ${
        selected
          ? 'border-primary bg-primary-container shadow-[inset_0_3px_0_0] shadow-primary'
          : 'border-outline-variant bg-surface-container-lowest'
      }`}
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
      <span className="text-xs leading-snug text-on-surface-muted">
        {derived ? (
          <span title={`Summed across ${metric.derivedFrom?.map((d) => labels.dimensionLabel(d).toLowerCase()).join(' × ')}`}>
            summed
          </span>
        ) : hasDetail ? (
          selected ? 'Showing' : 'View breakdown'
        ) : (
          'Overall figure only'
        )}
      </span>
    </button>
  );
}

function MetricDetail({
  metric,
  labels,
  year,
  pageKey,
}: {
  metric: MetricSummary;
  labels: LabelIndex;
  year: number | undefined;
  pageKey: string | undefined;
}) {
  const hasTrend = Boolean(metric.trend && metric.trend.rows.length > 0);

  // A breakdown along the dimension the trend already splits by shows the same
  // numbers with time collapsed out.
  const breakdowns = metric.breakdowns.filter((b) => !(hasTrend && b.dimension === metric.trend?.groupBy));

  if (!hasTrend && breakdowns.length === 0) {
    return (
      <Card>
        <EmptyState
          title={`${formatValue(metric.total, metric.unit)} ${metric.label.toLowerCase()}, with no breakdown behind it`}
          hint="Only an overall figure is recorded for this metric. Record it against a hub, gender or cohort and the split appears here."
        />
      </Card>
    );
  }

  return (
    <section aria-label={`${metric.label} detail`} className="space-y-card-gap">
      {hasTrend ? <TrendPanel metric={metric} labels={labels} /> : null}
      {!year ? <YearPanel metric={metric} pageKey={pageKey} /> : null}

      {breakdowns.length > 0 ? (
        <div className={`grid grid-cols-1 items-start gap-card-gap ${breakdowns.length > 1 ? 'xl:grid-cols-2' : ''}`}>
          {breakdowns.map((breakdown) => (
            <BreakdownPanel
              key={`${metric.key}-${breakdown.dimensions.join('-')}`}
              metric={metric}
              breakdown={breakdown}
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
const MAX_BARS = 10;

function BreakdownPanel({
  metric,
  breakdown,
  labels,
  year,
  qualifier,
}: {
  metric: MetricSummary;
  breakdown: MetricSummary['breakdowns'][number];
  labels: LabelIndex;
  year: number | undefined;
  /** A constant that applies to every row, named in the title. */
  qualifier?: string;
}) {
  if (breakdown.dimensions.length === 2) {
    return <CrossBreakdownPanel metric={metric} breakdown={breakdown} labels={labels} year={year} />;
  }

  const dimension = breakdown.dimension;
  const rows = breakdown.rows;
  const distinctValues = new Set(rows.map((r) => r.dimensions[dimension])).size;
  const colourByCategory = canColourByCategory(distinctValues);

  const data = rows
    .map((row) => ({
      name: labels.valueLabel(dimension, row.dimensions[dimension]),
      value: row.value,
      // Colour follows the category, not its rank — but only while there are
      // few enough categories for the palette to separate them.
      slot: colourByCategory ? labels.valueSlot(dimension, row.dimensions[dimension]) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, r) => sum + r.value, 0);
  const dimensionLabel = labels.dimensionLabel(dimension);
  const covers = metric.total !== null && Math.abs(total - metric.total) < 0.005;

  // Two values within a few percent of each other cannot be compared as arcs,
  // and a ring is only honest when its slices genuinely make up the whole.
  const sorted = [...data].sort((x, y) => y.value - x.value);
  const tooClose = sorted.some((row, i) => i > 0 && Math.abs(row.value - sorted[i - 1].value) / (sorted[i - 1].value || 1) < 0.05);
  const shortLabels = data.every((d) => d.name.length <= 12);

  /**
   * The form comes from the job:
   *   • an ordered axis (cohorts) → columns, where position carries the order;
   *   • parts that genuinely make up the whole, three to six of them and none
   *     of them near-identical → a ring, which reads as composition at a glance;
   *   • exactly two parts of a whole → one stacked bar, since a two-slice ring
   *     is a stat tile wearing a costume;
   *   • short labels and few categories → standing columns;
   *   • anything else → horizontal bars, which cope with long names and never
   *     make close values hard to compare.
   */
  const form = labels.isOrdered(dimension) && data.length <= 12
    ? 'columns'
    : covers && metric.aggregation === 'sum' && data.length >= 3 && data.length <= 6 && !tooClose
      ? 'donut'
      : covers && data.length === 2 && metric.aggregation === 'sum'
        ? 'share'
        : shortLabels && data.length <= 6
          ? 'columns'
          : 'bars';

  return (
    <Panel
      title={`${metric.label} by ${dimensionLabel.toLowerCase()}${qualifier ? ` — ${qualifier}` : ''}`}
      subtitle={`${formatValue(total, metric.unit)} total${year ? ` in ${year}` : ''}`}
      action={form === 'share' ? <CompositionLegend legend={[...data].sort((x, y) => x.slot - y.slot).map((d) => d.name)} /> : undefined}
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
      {form === 'donut' ? (
        <DonutChart slices={data} unit={metric.unit} centerLabel={dimensionLabel.toLowerCase()} />
      ) : form === 'columns' ? (
        <ColumnChart
          columns={[...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))}
          unit={metric.unit}
        />
      ) : form === 'share' ? (
        <CompositionBar
          rows={[{ name: dimensionLabel, total, segments: data.map((d) => ({ label: d.name, value: d.value, share: total ? d.value / total : null })) }]}
          legend={[...data].sort((x, y) => x.slot - y.slot).map((d) => d.name)}
          unit={metric.unit}
        />
      ) : (
        <BarList rows={data.slice(0, MAX_BARS)} unit={metric.unit} scale="max" />
      )}

      {data.length > MAX_BARS ? (
        <p className="mt-5 border-t border-outline-variant pt-4 text-secondary-text text-on-surface-variant">
          Showing the top {MAX_BARS} of {data.length} — the rest are in the table view. Past about ten
          categories a chart stops being readable, so the tail is listed rather than drawn.
        </p>
      ) : null}

      <CoverageNote total={total} headline={metric.total} unit={metric.unit} what={dimensionLabel} />
    </Panel>
  );
}

/**
 * A breakdown that does not add up to the figure above it is not an error — some
 * of the programme simply has no value recorded on that axis. Saying so is what
 * stops the chart reading as though it were the whole story.
 */
function CoverageNote({
  total,
  headline,
  unit,
  what,
}: {
  total: number;
  headline: number | null;
  unit: MetricSummary['unit'];
  what: string;
}) {
  if (headline === null || Math.abs(total - headline) < 0.005) return null;

  return (
    <p className="mt-5 border-t border-outline-variant pt-4 text-secondary-text text-on-surface-variant">
      Covers {formatValue(total, unit)} of {formatValue(headline, unit)} — the rest has no{' '}
      {what.toLowerCase()} recorded against it.
    </p>
  );
}

/**
 * Two dimensions at once, as a stacked bar per group.
 *
 * The axis with fewer distinct values does the grouping and the other becomes
 * the segments, so three hubs of six cohorts reads as three bars rather than
 * six — and the segment count stays inside the palette.
 */
function CrossBreakdownPanel({
  metric,
  breakdown,
  labels,
  year,
}: {
  metric: MetricSummary;
  breakdown: MetricSummary['breakdowns'][number];
  labels: LabelIndex;
  year: number | undefined;
}) {
  const [selected, setSelected] = useState('all');
  const [a, b] = breakdown.dimensions;
  const distinct = (d: string) => new Set(breakdown.rows.map((r) => r.dimensions[d])).size;

  /**
   * An axis with a single value is a constant, not a grouping.
   *
   * Absa records every entrepreneur as female, so "by gender and district"
   * grouped seventy-one districts under one panel. The constant belongs in the
   * title, and what is left is an ordinary one-dimension breakdown.
   */
  const constantAxis = distinct(a) === 1 ? a : distinct(b) === 1 ? b : null;
  if (constantAxis) {
    const varying = constantAxis === a ? b : a;
    const constantValue = labels.valueLabel(constantAxis, breakdown.rows[0]?.dimensions[constantAxis]);

    return (
      <BreakdownPanel
        metric={metric}
        breakdown={{
          ...breakdown,
          dimension: varying,
          dimensions: [varying],
        }}
        labels={labels}
        year={year}
        qualifier={constantValue.toLowerCase()}
      />
    );
  }

  const [groupBy, segmentBy] = distinct(a) <= distinct(b) ? [a, b] : [b, a];

  const groups = new Map<string, { name: string; total: number; segments: Array<{ label: string; value: number; share: number | null }> }>();
  for (const row of breakdown.rows) {
    const groupKey = row.dimensions[groupBy];
    const name = labels.valueLabel(groupBy, groupKey);
    if (!groups.has(name)) groups.set(name, { name, total: 0, segments: [] });
    const group = groups.get(name)!;
    group.total += row.value;
    group.segments.push({ label: labels.valueLabel(segmentBy, row.dimensions[segmentBy]), value: row.value, share: null });
  }

  const rows = [...groups.values()].map((g) => ({
    ...g,
    segments: g.segments.map((s) => ({ ...s, share: g.total ? s.value / g.total : null })),
  })).sort((x, y) => y.total - x.total);

  const legend = [...new Set(breakdown.rows.map((r) => r.dimensions[segmentBy]))]
    .sort((x, y) => labels.valueSlot(segmentBy, x) - labels.valueSlot(segmentBy, y))
    .map((v) => labels.valueLabel(segmentBy, v));

  const total = rows.reduce((sum, r) => sum + r.total, 0);
  // One scale across every panel, so the columns are comparable between groups.
  const sharedMax = Math.max(...breakdown.rows.map((r) => r.value), 0) || 1;
  const groupLabel = labels.dimensionLabel(groupBy).toLowerCase();
  const segmentLabel = labels.dimensionLabel(segmentBy).toLowerCase();

  /**
   * Holding one segment still turns the question around: instead of each hub's
   * run of cohorts, it is one cohort measured across the hubs. Same facts, and
   * the comparison the reader actually wants when they ask "how did cohort 3 do
   * everywhere".
   */
  const segmentValues = [...new Set(breakdown.rows.map((r) => r.dimensions[segmentBy]))].sort((x, y) =>
    labels.valueSlot(segmentBy, x) - labels.valueSlot(segmentBy, y)
  );

  const isFiltered = selected !== 'all';
  const filteredRows = isFiltered
    ? breakdown.rows
        .filter((r) => r.dimensions[segmentBy] === selected)
        .map((r) => ({
          name: labels.valueLabel(groupBy, r.dimensions[groupBy]),
          value: r.value,
          slot: canColourByCategory(rows.length) ? labels.valueSlot(groupBy, r.dimensions[groupBy]) : 0,
        }))
        .sort((x, y) => y.value - x.value)
    : [];
  const filteredTotal = filteredRows.reduce((sum, r) => sum + r.value, 0);

  const filter = (
    <FilterSelect
      id={`cross-${metric.key}-${segmentBy}`}
      label={labels.dimensionLabel(segmentBy)}
      value={selected}
      onChange={setSelected}
      options={[
        { value: 'all', label: `All ${segmentLabel}s`, count: segmentValues.length },
        ...segmentValues.map((v) => ({ value: v, label: labels.valueLabel(segmentBy, v) })),
      ]}
    />
  );

  return (
    <Panel
      title={
        isFiltered
          ? `${metric.label} by ${groupLabel} — ${labels.valueLabel(segmentBy, selected)}`
          : `${metric.label} by ${groupLabel} and ${segmentLabel}`
      }
      subtitle={`${formatValue(isFiltered ? filteredTotal : total, metric.unit)} total${year ? ` in ${year}` : ''}`}
      action={filter}
      table={{
        columns: [
          { key: 'group', label: labels.dimensionLabel(groupBy) },
          { key: 'segment', label: labels.dimensionLabel(segmentBy) },
          { key: 'value', label: metric.label, align: 'right' },
        ],
        rows: breakdown.rows
          .filter((r) => !isFiltered || r.dimensions[segmentBy] === selected)
          .map((r) => ({
            group: labels.valueLabel(groupBy, r.dimensions[groupBy]),
            segment: labels.valueLabel(segmentBy, r.dimensions[segmentBy]),
            value: formatValue(r.value, metric.unit),
          })),
      }}
    >
{isFiltered ? (
        <BarList rows={filteredRows} unit={metric.unit} scale="max" />
      ) : (
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const columns = [...row.segments]
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
            .map((seg) => ({
              name: seg.label.replace(/^Cohort /, 'C'),
              value: seg.value,
              slot: canColourByCategory(legend.length) ? legend.indexOf(seg.label) : 0,
            }));

          return (
            <div key={row.name} className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="truncate text-body-text font-medium text-on-surface">{row.name}</span>
                <span className="tnum shrink-0 text-secondary-text text-on-surface-variant">
                  {formatValue(row.total, metric.unit)}
                </span>
              </div>

              {columns.length === 1 ? (
                <div className="flex h-[110px] flex-col justify-end pb-6">
                  <p className="text-secondary-text text-on-surface-variant">
                    {columns[0].name} only — {formatValue(columns[0].value, metric.unit)}
                  </p>
                </div>
              ) : (
                <ColumnChart compact height={110} unit={metric.unit} columns={columns} max={sharedMax} />
              )}
            </div>
          );
        })}
      </div>
      )}

      {isFiltered ? null : (
        <CoverageNote total={total} headline={metric.total} unit={metric.unit} what={`${groupLabel} and ${segmentLabel}`} />
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
  /** True when the values form a sequence — cohorts, tiers, years. */
  isOrdered: (dimension: string) => boolean;
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
    // Numeric values mean the axis is a sequence, so position can carry order
    // and a column chart says more than a ranked bar.
    isOrdered: (dimension) => {
      const values = byName.get(dimension)?.values ?? [];
      return values.length > 0 && values.every((v) => /^\d+$/.test(v.value));
    },
  };
}

/**
 * How a figure has moved across whole years.
 *
 * Columns rather than a line: three or four discrete periods are compared, not
 * a continuous series, and a line between four points implies readings in
 * between that nobody took. Hidden when a single year is already selected — the
 * chart would be one column.
 */
function YearPanel({ metric, pageKey }: { metric: MetricSummary; pageKey: string | undefined }) {
  const byYear = useMetricByYear(pageKey, metric.key);
  const points = byYear.data?.points ?? [];

  if (points.length < 2) return null;

  const columns = points.map((p) => ({ name: String(p.year), value: p.value }));

  const total = columns.reduce((sum, c) => sum + c.value, 0);

  return (
    <Panel
      title={`${metric.label} by year`}
      subtitle={`${formatValue(total, metric.unit)} across ${columns.length} years`}
      table={{
        columns: [
          { key: 'year', label: 'Year' },
          { key: 'value', label: metric.label, align: 'right' },
        ],
        rows: columns.map((c) => ({ year: c.name, value: formatValue(c.value, metric.unit) })),
      }}
    >
      <ColumnChart columns={columns} unit={metric.unit} />
    </Panel>
  );
}
