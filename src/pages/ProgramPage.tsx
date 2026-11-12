import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDimensions, useMetricByYear, useProgramSummary } from '../hooks/useData';
import { errorMessage, isApiError, type Dimension, type MetricSummary } from '../lib/api';
import { formatValue, humanise, shortPeriod } from '../lib/format';
import { buildLabelIndex, type LabelIndex } from '../lib/labels';
import { ALL_PAIRS_SAFE, SERIES, canColourByCategory, seriesColor } from '../lib/chart';
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
import { PairedBars, type PairedRow } from '../components/charts/PairedBars';
import { RecordFigureDialog } from '../components/entry/RecordFigureDialog';
import { RecordGrowCohortDialog } from '../components/entry/RecordGrowCohortDialog';

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

  const confidence = useMemo(() => pairConfidence(metrics, labels), [metrics, labels]);

  /**
   * The figures that get a card.
   *
   * Skill confidence before and after drop out of the row while the panel
   * below is showing them: two cards the reader has to subtract from each
   * other, sitting above a chart that has already done the subtraction, is the
   * same pair of numbers printed twice.
   */
  const carded = useMemo(
    () => (confidence ? metrics.filter((m) => !CONFIDENCE_KEYS.includes(m.key)) : metrics),
    [metrics, confidence]
  );

  // Reset when the programme or period changes, so the selection can never
  // point at a metric that is no longer present.
  useEffect(() => {
    if (carded.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (selectedKey && carded.some((m) => m.key === selectedKey)) return;
    const lead = carded.find((m) => detailCount(m) > 0) ?? carded[0];
    setSelectedKey(lead.key);
    // Every page opens showing everything it reports, and the category filter
    // is there to narrow it. Opening narrowed hid the figures that were the
    // point of the page: Venture Support showed two of its ten, without the 620
    // enterprises or the 2,797 jobs, and no heuristic for guessing which group
    // matters survived contact with the tree — by count MEST X leads on social
    // media, which is not what MEST X is about.
    setCategory('all');
  }, [pageKey, year, carded.map((m) => m.key).join('|')]);

  const groups = useMemo(() => {
    const byCategory = new Map<string, MetricSummary[]>();
    for (const metric of carded) {
      const key = metric.category ?? 'other';
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(metric);
    }
    return [...byCategory.entries()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0])
    );
  }, [carded]);

  const visible = useMemo(
    () => (category === 'all' || !category ? carded : carded.filter((m) => (m.category ?? 'other') === category)),
    [carded, category]
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
  const selected = carded.find((m) => m.key === selectedKey) ?? null;
  const canEdit = can('editor');

  return (
    <div className="space-y-8">
      {/*
        A page says what it is about or says nothing. The two stock lines that
        used to sit here — "Combined figures for every programme in this group"
        and its sibling — were filler under every title that had no description
        of its own, and a reader learns nothing from a sentence that is true of
        forty pages. Where a programme has something to say, the catalog says it.

        The sync badge has gone with them, by request. Whether a sheet could be
        reached is on the Imports page, which is where it is acted on.
      */}
      <PageHeader
        title={program.name}
        subtitle={program.description ?? undefined}
        actions={
          <>
            {/*
              Hidden where the connected sheet is the source of truth: Web3,
              Pre-Mest, Hospitality and DIGILOGIC are all recounted from their
              sheets on every sync, so a hand-typed figure there would be
              overwritten on the next one.
            */}
            {canEdit && !rolledUp && program.allowsManualEntry ? (
              <Button variant="primary" onClick={() => setRecording(true)}>
                Record a figure
              </Button>
            ) : null}
          </>
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
                    const inGroup = carded.filter((m) => next === 'all' || (m.category ?? 'other') === next);
                    const lead = inGroup.find((m) => detailCount(m) > 0) ?? inGroup[0];
                    if (lead) setSelectedKey(lead.key);
                  }}
                  options={[
                    { value: 'all', label: 'All figures', count: carded.length },
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
          </section>

          {confidence ? <ConfidencePanel pair={confidence} labels={labels} /> : null}

          {selected ? <MetricDetail metric={selected} labels={labels} year={year} pageKey={pageKey} /> : null}
        </>
      )}

      {/*
        Grow gets a form built around what it actually records — a cohort at a
        hub, with three counts against it — because it is entered that way every
        time. Every other programme uses the general three-step dialog.
      */}
      {pageKey === GROW_PAGE_KEY ? (
        <RecordGrowCohortDialog
          open={recording}
          onClose={() => setRecording(false)}
          programKey={program.pageKey}
        />
      ) : (
        <RecordFigureDialog
          open={recording}
          onClose={() => setRecording(false)}
          initialProgram={program.pageKey}
          initialMetric={selectedKey ?? undefined}
        />
      )}
    </div>
  );
}

function detailCount(metric: MetricSummary) {
  return metric.breakdowns.length + (metric.trend?.rows.length ? 1 : 0);
}

const CONFIDENCE_BEFORE = 'skill_confidence_before';
const CONFIDENCE_AFTER = 'skill_confidence_after';
const CONFIDENCE_KEYS: string[] = [CONFIDENCE_BEFORE, CONFIDENCE_AFTER];

type ConfidencePair = {
  metric: MetricSummary;
  /** The axis the pair is drawn along, or null when only the two totals exist. */
  dimension: string | null;
  rows: PairedRow[];
};

/**
 * Matches the before and after figures up into one comparison.
 *
 * Keyed off the metrics rather than off the page, so any programme that comes
 * to report both gets the comparison without another branch here.
 */
function pairConfidence(metrics: MetricSummary[], labels: LabelIndex): ConfidencePair | null {
  const before = metrics.find((m) => m.key === CONFIDENCE_BEFORE);
  const after = metrics.find((m) => m.key === CONFIDENCE_AFTER);
  if (!before || !after) return null;

  // An axis both of them record on. Two breakdowns along different axes
  // cannot be paired row for row, whatever their labels suggest.
  const shared = before.breakdowns
    .filter((b) => b.dimensions.length === 1)
    .map((b) => b.dimension)
    .find((name) => after.breakdowns.some((b) => b.dimensions.length === 1 && b.dimension === name));

  if (!shared) {
    // No shared axis, but there is still the one comparison that matters.
    if (before.total === null || after.total === null) return null;
    return {
      metric: after,
      dimension: null,
      rows: [{ name: 'Overall', before: before.total, after: after.total }],
    };
  }

  const afterByValue = new Map(
    after.breakdowns
      .find((b) => b.dimensions.length === 1 && b.dimension === shared)!
      .rows.map((row) => [row.dimensions[shared], row.value])
  );

  const rows = before.breakdowns
    .find((b) => b.dimensions.length === 1 && b.dimension === shared)!
    .rows
    // Rated before the teaching but not after it: there is no pair to draw,
    // and a lone bar beside an empty one reads as a collapse to zero.
    .filter((row) => afterByValue.has(row.dimensions[shared]))
    .map((row) => ({
      name: labels.valueLabel(shared, row.dimensions[shared]),
      before: row.value,
      after: afterByValue.get(row.dimensions[shared])!,
    }))
    .sort((a, b) => b.after - a.after);

  return rows.length ? { metric: after, dimension: shared, rows } : null;
}

function ConfidencePanel({ pair, labels }: { pair: ConfidencePair; labels: LabelIndex }) {
  const { metric, dimension, rows } = pair;

  return (
    <Panel
      title="Skill confidence, before and after"
      subtitle={
        dimension
          ? `By ${labels.dimensionLabel(dimension).toLowerCase()}. Self-rated, averaged across every topic assessed.`
          : 'Self-rated, averaged across every topic assessed.'
      }
      table={{
        columns: [
          { key: 'name', label: dimension ? labels.dimensionLabel(dimension) : 'Figure' },
          { key: 'before', label: 'Before', align: 'right' },
          { key: 'after', label: 'After', align: 'right' },
          { key: 'change', label: 'Change', align: 'right' },
        ],
        rows: rows.map((row) => ({
          name: row.name,
          before: formatValue(row.before, metric),
          after: formatValue(row.after, metric),
          change: `${row.after - row.before >= 0 ? '+' : '−'}${Math.abs(row.after - row.before).toFixed(1)} pts`,
        })),
      }}
    >
      <PairedBars rows={rows} unit={metric} />
    </Panel>
  );
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
  // On a roll-up the figure is several programmes added together, and saying so
  // is the difference between "Venture Support supported 620 businesses" and a
  // reader taking 620 for one programme's number.
  const rolledUp = metric.programCount > 1;

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
        {metric.total === null ? '—' : formatValue(metric.total, metric)}
      </span>
      <span className="text-xs leading-snug text-on-surface-muted">
        {rolledUp ? (
          <span
            title={
              metric.basis === 'partly_derived'
                ? `One figure from each of ${metric.programCount} programmes, added. Some of them state no overall total, so theirs is summed from the finest breakdown they do record.`
                : `One figure from each of ${metric.programCount} programmes, added.`
            }
          >
            {metric.programCount} programmes
          </span>
        ) : hasDetail ? (
          selected ? 'Showing' : 'View breakdown'
        ) : null}
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
  const breakdowns = metric.breakdowns
    .filter((b) => !(hasTrend && b.dimension === metric.trend?.groupBy))
    .filter((b) => !b.dimensions.some((d) => HIDDEN_BREAKDOWNS.includes(d)))
    // Gender leads, wherever it appears and whatever it is paired with. It is
    // the cut these programmes are reported and funded against, so it should
    // not be something a reader scrolls to find. `sort` is stable, so
    // everything else keeps the order the API sent.
    .slice()
    .sort((x, y) => genderRank(x) - genderRank(y));

  // A figure with nothing behind it gets no panel. An empty card explaining
  // its own emptiness is a row of screen that tells the reader nothing they
  // could not see from the card they just clicked.
  if (!hasTrend && breakdowns.length === 0) return null;

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

const GENDER = 'gender';

/**
 * Axes that get no panel of their own here.
 *
 * `platform` is EdTech Mondays' second count of one season — the same figures
 * the channel breakdown already shows, grouped the other way — and as a chart
 * it says nothing: Facebook carries 13.3M of 13.4M impressions, so the panel
 * is one full-height bar beside four slivers. It is shown properly, as cards
 * with their own figures, on the EdTech Mondays page.
 *
 * `company` is a roster rather than an axis. The portfolio's ninety-seven
 * ventures are one enterprise each, so charting them draws ninety-seven bars
 * of identical length — a list that has learnt to look like a chart. The names
 * are worth showing; they are worth showing as names.
 */
const HIDDEN_BREAKDOWNS = ['platform', 'company'];

const genderRank = (breakdown: MetricSummary['breakdowns'][number]) =>
  breakdown.dimensions.includes(GENDER) ? 0 : 1;

/** The one programme with a purpose-built entry form. */
const GROW_PAGE_KEY = 'digital-skills-grow';

/** Columns that still fit legibly inside one small multiple. */
const MAX_COMPACT_COLUMNS = 6;

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

  const ranked = rows
    .map((row) => ({
      name: labels.valueLabel(dimension, row.dimensions[dimension]),
      value: row.value,
      // Colour follows the category while the palette can separate them, so a
      // hub is the same hue in every chart it appears in.
      slot: colourByCategory ? labels.valueSlot(dimension, row.dimensions[dimension]) : -1,
    }))
    .sort((a, b) => b.value - a.value);

  /**
   * Too many categories for the palette: colour the leaders and fold the tail
   * into one neutral.
   *
   * This is rank-based colouring, which is normally wrong — but it is safe here
   * precisely because these categories appear in exactly one chart. Absa's
   * fifteen regions and seventy-one districts are named nowhere else, so there
   * is no cross-chart identity for a re-rank to break, and the alternative was
   * every bar in one flat hue.
   */
  const data = colourByCategory
    ? ranked
    : ranked.map((row, index) => ({ ...row, slot: index < SERIES.length ? index : -1 }));

  /**
   * An average is not a sum. Three disciplines at roughly 80% confidence make
   * "80.8% average", not "242.3% total" — and they are not slices of a whole,
   * so no part-to-whole form applies to them either.
   */
  const isAverage = metric.aggregation === 'avg';
  const summed = data.reduce((sum, r) => sum + r.value, 0);
  const total = isAverage && data.length ? summed / data.length : summed;
  const dimensionLabel = labels.dimensionLabel(dimension);
  const covers = !isAverage && metric.total !== null && Math.abs(total - metric.total) < 0.005;

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
  const form = data.length === 1
    ? 'single'
    : labels.isOrdered(dimension) && data.length <= 12
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
      subtitle={`${formatValue(total, metric)} ${isAverage ? 'average' : 'total'}${year ? ` in ${year}` : ''}`}
      action={form === 'share' ? <CompositionLegend legend={[...data].sort((x, y) => x.slot - y.slot).map((d) => d.name)} /> : undefined}
      table={{
        columns: [
          { key: 'name', label: dimensionLabel },
          { key: 'value', label: metric.label, align: 'right' },
          { key: 'share', label: 'Share', align: 'right' },
        ],
        rows: data.map((r) => ({
          name: r.name,
          value: formatValue(r.value, metric),
          share: total ? `${((r.value / total) * 100).toFixed(1)}%` : '—',
        })),
      }}
    >
      {form === 'single' ? (
        // Every row shares one value — MEST Scale's enterprises are all Medium.
        // A chart of a single bar compares nothing; the fact is the whole story.
        <p className="text-body-text text-on-surface-variant">
          All {formatValue(data[0].value, metric)} are{' '}
          <span className="font-medium text-on-surface">{data[0].name}</span>.
        </p>
      ) : form === 'donut' ? (
        <DonutChart slices={data} unit={metric} centerLabel={dimensionLabel.toLowerCase()} />
      ) : form === 'columns' ? (
        <ColumnChart
          /*
            An ordered axis keeps its own order — cohort 3 belongs between 2
            and 4 whatever it scored. Anything else reads largest first, so
            the heights descend and the answer is the leftmost column.
          */
          columns={
            labels.isOrdered(dimension)
              ? [...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
              : [...data].sort((a, b) => b.value - a.value)
          }
          unit={metric}
        />
      ) : form === 'share' ? (
        <CompositionBar
          rows={[{ name: dimensionLabel, total, segments: data.map((d) => ({ label: d.name, value: d.value, share: total ? d.value / total : null })) }]}
          legend={[...data].sort((x, y) => x.slot - y.slot).map((d) => d.name)}
          unit={metric}
        />
      ) : (
        <BarList rows={data.slice(0, MAX_BARS)} unit={metric} scale="max" />
      )}
    </Panel>
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

  const [fewer, more] = distinct(a) <= distinct(b) ? [a, b] : [b, a];

  /**
   * Two ways to draw the same cross-tab, and the narrow axis decides which.
   *
   * A split into two or three parts — gender, most obviously — is a
   * part-to-whole of each row: every enterprise is counted once, under one
   * gender, so the parts make the row's total. That draws as one stacked bar
   * per row, where length is the total and the segments are the split. Five
   * rows of that is a chart the height of a paragraph.
   *
   * The alternative — a small-multiple column chart per value of the narrow
   * axis — spends a panel and a hue on every column, which is the right shape
   * for a wide unordered axis and far too much furniture for a gender split.
   *
   * Held to metrics that add up. Stacking averages would draw three
   * satisfaction scores end to end and call the result a total.
   */
  const stacked =
    metric.aggregation === 'sum' && distinct(fewer) > 1 && distinct(fewer) <= ALL_PAIRS_SAFE;

  // Stacked, the narrow axis is the colour and the wide one the rows. Otherwise
  // the narrow axis panels the chart, as before.
  const [groupBy, segmentBy] = stacked ? [more, fewer] : [fewer, more];

  const groups = new Map<
    string,
    { key: string; name: string; total: number; segments: Array<{ label: string; value: number; share: number | null }> }
  >();
  for (const row of breakdown.rows) {
    const groupKey = row.dimensions[groupBy];
    const name = labels.valueLabel(groupBy, groupKey);
    if (!groups.has(name)) groups.set(name, { key: groupKey, name, total: 0, segments: [] });
    const group = groups.get(name)!;
    group.total += row.value;
    group.segments.push({ label: labels.valueLabel(segmentBy, row.dimensions[segmentBy]), value: row.value, share: null });
  }

  /**
   * An axis with an order of its own keeps it: cohort 1 reads above cohort 2,
   * whichever of them turned out larger. Ranking those by size asks the reader
   * to find the sequence for themselves before they can follow it, and hides
   * the one thing a cohort axis is for — whether the programme is growing.
   *
   * Everything else still leads with its largest.
   */
  const rows = [...groups.values()]
    .map((g) => ({
      ...g,
      segments: g.segments.map((s) => ({ ...s, share: g.total ? s.value / g.total : null })),
    }))
    .sort((x, y) =>
      labels.isOrdered(groupBy)
        ? labels.valueSlot(groupBy, x.key) - labels.valueSlot(groupBy, y.key)
        : y.total - x.total
    );

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
      subtitle={`${formatValue(isFiltered ? filteredTotal : total, metric)} total${year ? ` in ${year}` : ''}`}
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
            value: formatValue(r.value, metric),
          })),
      }}
    >
{isFiltered ? (
        <BarList rows={filteredRows} unit={metric} scale="max" />
      ) : stacked ? (
        <div className="flex flex-col gap-4">
          {/* Rows are drawn to their own totals, so length compares the groups
              while the segments compare the split inside each one. */}
          <CompositionBar
            rows={rows}
            legend={legend}
            unit={metric}
            max={Math.max(...rows.map((r) => r.total), 0) || 1}
          />
          <CompositionLegend legend={legend} />
        </div>
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
                  {formatValue(row.total, metric)}
                </span>
              </div>

              {columns.length === 1 ? (
                <div className="flex h-[110px] flex-col justify-end pb-6">
                  <p className="text-secondary-text text-on-surface-variant">
                    {columns[0].name} only — {formatValue(columns[0].value, metric)}
                  </p>
                </div>
              ) : columns.length > MAX_COMPACT_COLUMNS ? (
                // A small multiple is a third of a panel wide. Nine hubs of
                // UNDP-YAI jobs crushed into that many columns leaves the tick
                // labels overlapping each other and unreadable; turned on their
                // side the names have room to be read.
                <BarList
                  rows={[...columns].sort((a, b) => b.value - a.value)}
                  unit={metric}
                  scale="max"
                />
              ) : (
                <ColumnChart compact height={110} unit={metric} columns={columns} max={sharedMax} />
              )}
            </div>
          );
        })}
      </div>
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
              point[s.label] === undefined ? '—' : formatValue(point[s.label] as number, metric),
            ])
          ),
        })),
      }}
    >
      <TrendLine data={data} seriesKeys={seriesKeys} unit={metric} />    </Panel>
  );
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
      subtitle={`${formatValue(total, metric)} across ${columns.length} years`}
      table={{
        columns: [
          { key: 'year', label: 'Year' },
          { key: 'value', label: metric.label, align: 'right' },
        ],
        rows: columns.map((c) => ({ year: c.name, value: formatValue(c.value, metric) })),
      }}
    >
      <ColumnChart columns={columns} unit={metric} />
    </Panel>
  );
}
