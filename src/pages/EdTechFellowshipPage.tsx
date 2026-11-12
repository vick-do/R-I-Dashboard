import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { keys, useProgramSummary, useDimensions, useTargets, useMetricByYear } from '../hooks/useData';
import { api, errorMessage, type MetricSummary, type ProgramTarget } from '../lib/api';
import { formatValue } from '../lib/format';
import { buildLabelIndex } from '../lib/labels';
import { SERIES, seriesColor } from '../lib/chart';
import { usePeriod } from '../lib/period';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Panel } from '../components/ui/Panel';
import { ChevronDownIcon } from '../components/ui/Icons';
import { FigureTile } from '../components/ui/FigureTile';
import { BarList } from '../components/charts/BarList';
import { ColumnChart } from '../components/charts/ColumnChart';
import { DonutChart } from '../components/charts/DonutChart';
import { CompositionBar, CompositionLegend } from '../components/charts/CompositionBar';
import { TrendLine, type TrendPoint } from '../components/charts/TrendLine';

export const FELLOWSHIP_PAGE_KEY = 'venture-support-edtech-fellowship';

/** The figures across the top, biggest audience first. */
const HEADLINE_KEYS = [
  'users_reached', 'edtech_learners_impacted', 'learners_outcomes', 'educators_trained',
  'enterprises_total', 'institutions_reached', 'partnerships', 'employees_hired',
  'monthly_revenue', 'educators_using_edtech',
];

const TILE_LABELS: Record<string, string> = {
  users_reached: 'Users reached',
  edtech_learners_impacted: 'Learners reached',
  learners_outcomes: 'Achieved outcomes',
  educators_using_edtech: 'Educators using EdTech',
  enterprises_total: 'Companies',
};

/** Decoration only, keyed to the figure so it never moves with the row. */
const accent = (key: string) => SERIES[HEADLINE_KEYS.indexOf(key) % SERIES.length];

/** The three audiences reported the same way, and worth reading against each other. */
const AUDIENCES = [
  { key: 'users_reached', active: 'active_users', label: 'Users' },
  { key: 'edtech_learners_impacted', active: 'active_learners', label: 'Learners' },
  { key: 'educators_trained', active: null, label: 'Educators' },
];

/** Rows of a breakdown, keyed by the dimension value they sit under. */
function byValue(metric: MetricSummary | undefined, dimension: string): Map<string, number> {
  const breakdown = metric?.breakdowns.find((b) => b.dimensions.length === 1 && b.dimension === dimension);
  return new Map((breakdown?.rows ?? []).map((row) => [row.dimensions[dimension], row.value]));
}

/** How far along a target is, capped for the bar but never for the number. */
const progress = (t: ProgramTarget) => (t.actual === null || !t.target ? null : t.actual / t.target);

/** A company's learners, as the cohort × company breakdown records them. */
type CompanyFigure = { cohort: string; company: string; value: number };

function companyFigures(metric: MetricSummary | undefined): CompanyFigure[] {
  const breakdown = metric?.breakdowns.find(
    (b) => b.dimensions.length === 2 && b.dimensions.includes('cohort') && b.dimensions.includes('company')
  );
  return (breakdown?.rows ?? []).map((row) => ({
    cohort: row.dimensions.cohort,
    company: row.dimensions.company,
    value: row.value,
  }));
}

/**
 * The fellowship's summary for each year it has run, fetched side by side.
 *
 * Shares its cache key with `useProgramSummary`, so picking a year in the
 * filter bar afterwards costs nothing.
 */
function useYearSummaries(years: number[]) {
  return useQueries({
    queries: years.map((y) => ({
      queryKey: keys.summary(FELLOWSHIP_PAGE_KEY, y),
      queryFn: () => api.summary(FELLOWSHIP_PAGE_KEY, { year: y }),
    })),
  });
}

/** How many companies the trend draws; thirty-six lines would be a tangle. */
const TREND_COMPANIES = 6;

/** The dashboard's own teal, for the banner, the icon tiles and the filter bar. */
const BRAND = SERIES[0];

/**
 * The Mastercard Foundation EdTech Fellowship, as its own impact dashboard.
 *
 * Laid out after the programme's Looker dashboard: a banner, one filter bar
 * (cohort, fellow, year), the headline figures in three cards, then the
 * breakdowns. Only learners and users are recorded per cohort, and only
 * learners per company, so a filter narrows those and the other figures say
 * plainly that they are for the whole fellowship.
 */
export function EdTechFellowshipPage() {
  const { year, setYear } = usePeriod();
  const [cohort, setCohort] = useState('');
  const [company, setCompany] = useState('');

  const summary = useProgramSummary(FELLOWSHIP_PAGE_KEY, year);
  // The cohort table and each company's columns are all-time figures, so the
  // cohort and fellow pages read them from here whatever year is picked.
  const allTime = useProgramSummary(FELLOWSHIP_PAGE_KEY);
  const { data: dimensions = [] } = useDimensions();
  const { data: targetData } = useTargets(FELLOWSHIP_PAGE_KEY);
  const learnerYears = useMetricByYear(FELLOWSHIP_PAGE_KEY, 'edtech_learners_impacted');
  const labels = useMemo(() => buildLabelIndex(dimensions), [dimensions]);

  const years = useMemo(
    () => (learnerYears.data?.points ?? []).map((p) => p.year).sort((a, b) => a - b),
    [learnerYears.data]
  );
  const yearSummaries = useYearSummaries(years);

  const metrics = summary.data?.metrics ?? [];
  const byKey = useMemo(() => new Map(metrics.map((m) => [m.key, m])), [metrics]);
  const allByKey = useMemo(
    () => new Map((allTime.data?.metrics ?? []).map((m) => [m.key, m])),
    [allTime.data]
  );
  const allCompanies = useMemo(() => companyFigures(allByKey.get('edtech_learners_impacted')), [allByKey]);

  const cohorts = useMemo(() => {
    const companies = byValue(byKey.get('enterprises_total'), 'cohort');
    const youthLed = byValue(byKey.get('enterprises_youth_led'), 'cohort');

    return [...companies.entries()]
      .sort((a, b) => labels.valueSlot('cohort', a[0]) - labels.valueSlot('cohort', b[0]))
      .map(([value, total]) => ({
        key: value,
        name: labels.valueLabel('cohort', value),
        companies: total,
        youthLed: youthLed.get(value) ?? 0,
      }));
  }, [byKey, labels]);

  /** Every company in the period shown, with its cohort. */
  const companies = useMemo(() => companyFigures(byKey.get('edtech_learners_impacted')), [byKey]);

  /** Learners per cohort, summed from the companies in it. */
  const cohortLearners = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of companies) totals.set(c.cohort, (totals.get(c.cohort) ?? 0) + c.value);
    return [...totals.entries()].sort((a, b) => labels.valueSlot('cohort', a[0]) - labels.valueSlot('cohort', b[0]));
  }, [companies, labels]);

  /** Each year's companies, keyed by year. Empty until those summaries load. */
  const companiesByYear = useMemo(() => {
    const out = new Map<number, CompanyFigure[]>();
    years.forEach((y, i) => {
      const data = yearSummaries[i]?.data;
      if (data) out.set(y, companyFigures(data.metrics.find((m) => m.key === 'edtech_learners_impacted')));
    });
    return out;
  }, [years, yearSummaries]);

  const inScope = (c: CompanyFigure) => (!cohort || c.cohort === cohort) && (!company || c.company === company);

  const targets = targetData?.targets ?? [];
  const allTimeTargets = targets.filter((t) => t.year === null);
  const yearTargets = targets.filter((t) => t.year !== null);

  const cohortName = cohort ? labels.valueLabel('cohort', cohort) : '';
  const companyName = company ? labels.valueLabel('company', company) : '';
  const title = company
    ? `EdTech Fellowship · ${companyName}`
    : cohort
      ? `EdTech Fellowship ${cohortName} Impact Dashboard`
      : 'EdTech Fellowship Impact Dashboard';

  const description = summary.data?.program.description;
  const banner = (
    <header className="min-w-0 space-y-2">
      <div className="rounded-xl px-4 py-2.5" style={{ backgroundColor: BRAND }}>
        <h1 className="text-base font-extrabold uppercase leading-tight tracking-tight text-white sm:text-lg">
          {title}
        </h1>
      </div>
      {description ? <p className="text-secondary-text text-on-surface-variant">{description}</p> : null}
    </header>
  );

  if (summary.isLoading) {
    return (
      <div className="space-y-6">
        {banner}
        <Skeleton className="h-16" />
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (summary.isError) {
    return (
      <div className="space-y-6">
        {banner}
        <Card>
          <ErrorState message={errorMessage(summary.error)} onRetry={() => void summary.refetch()} />
        </Card>
      </div>
    );
  }

  const total = (key: string) => byKey.get(key)?.total ?? null;
  const filtered = Boolean(cohort || company);
  const WHOLE = filtered ? 'Whole fellowship' : undefined;

  const learners = filtered
    ? companies.filter(inScope).reduce((s, c) => s + c.value, 0)
    : total('edtech_learners_impacted');
  const users = company
    ? null
    : cohort
      ? byValue(byKey.get('users_reached'), 'cohort').get(cohort) ?? null
      : total('users_reached');

  const cohortOptions = [...new Set(allCompanies.map((c) => c.cohort))]
    .sort((a, b) => labels.valueSlot('cohort', a) - labels.valueSlot('cohort', b))
    .map((value) => ({ value, label: labels.valueLabel('cohort', value) }));
  const companyOptions = allCompanies
    .filter((c) => !cohort || c.cohort === cohort)
    .map((c) => ({ value: c.company, label: labels.valueLabel('company', c.company) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const shownCohorts = cohortLearners.filter(([value]) => !cohort || value === cohort);

  return (
    <div className="space-y-6">
      {banner}

      <FilterBar
        filters={[
          {
            id: 'fellowship-cohort',
            label: 'Cohort',
            value: cohort,
            allLabel: 'All cohorts',
            options: cohortOptions,
            onChange: (value) => {
              setCohort(value);
              if (value && company && !allCompanies.some((c) => c.company === company && c.cohort === value)) setCompany('');
            },
          },
          {
            id: 'fellowship-fellow',
            label: 'Fellows',
            value: company,
            allLabel: 'All fellows',
            options: companyOptions,
            onChange: setCompany,
          },
          {
            id: 'fellowship-year',
            label: 'Year',
            value: year === undefined ? '' : String(year),
            allLabel: 'All years',
            options: years.map((y) => ({ value: String(y), label: String(y) })),
            onChange: (value) => setYear(value ? Number(value) : undefined),
          },
        ]}
        onClear={
          filtered || year !== undefined
            ? () => {
                setCohort('');
                setCompany('');
                setYear(undefined);
              }
            : undefined
        }
      />

      {company ? (
        <FellowView
          company={company}
          metrics={allByKey}
          labels={labels}
          companies={allCompanies}
          companiesByYear={companiesByYear}
          yearPicked={year !== undefined}
        />
      ) : cohort ? (
        <CohortView
          cohort={cohort}
          metrics={allByKey}
          labels={labels}
          companies={allCompanies}
          companiesByYear={companiesByYear}
          yearPicked={year !== undefined}
        />
      ) : metrics.length === 0 ? (
        <Card>
          <EmptyState
            title={year ? `Nothing recorded for ${year}` : 'Nothing recorded yet'}
            hint="The fellowship's figures are read from the Fellowship tab of the workbook."
          />
        </Card>
      ) : (
        <>
          {/* Every headline figure in one uniform row of tiles. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {[
              { key: 'users', label: 'Users', value: users, note: company ? 'Not reported per fellow' : undefined },
              { key: 'active_users', label: 'Active users', value: total('active_users'), note: WHOLE },
              { key: 'learners', label: 'Learners', value: learners },
              { key: 'active_learners', label: 'Active learners', value: total('active_learners'), note: WHOLE },
              {
                key: 'learners_outcomes',
                label: 'Learners (outcomes achieved)',
                value: total('learners_outcomes'),
                note: WHOLE,
              },
              { key: 'institutions_reached', label: 'Learning institutions', value: total('institutions_reached'), note: WHOLE },
              { key: 'educators_trained', label: 'Educators trained', value: total('educators_trained'), note: WHOLE },
              ...SECONDARY_KEYS.filter((key) => byKey.has(key)).map((key) => ({
                key,
                label: TILE_LABELS[key] ?? byKey.get(key)!.label,
                value: total(key),
                note: WHOLE,
              })),
            ].map((tile, i) => {
              const metric = byKey.get(tile.key);
              return (
                <FigureTile
                  key={tile.key}
                  label={tile.label}
                  value={tile.value}
                  colour={seriesColor(i % SERIES.length)}
                  exact={tile.value === null ? '' : formatValue(tile.value, metric ?? 'count')}
                  note={tile.note}
                  showExact
                />
              );
            })}
          </div>

          <AudiencePanel metrics={byKey} />

          <Section title="Who the fellowship reaches">
            {/* Gender leads every breakdown on a programme page. */}
            <div className="grid grid-cols-1 items-start gap-card-gap xl:grid-cols-2">
              <GenderPanel metrics={byKey} labels={labels} />
              <ReachedActivePanel metrics={byKey} />
            </div>
            <InclusionPanel metrics={byKey} labels={labels} />
          </Section>

          {cohortLearners.length > 0 || cohorts.length > 0 ? (
            <Section title="The cohorts">
              <div className="grid grid-cols-1 items-start gap-card-gap xl:grid-cols-3">
                {cohortLearners.length > 0 ? (
                  <CohortLearnersPanel cohorts={cohortLearners} labels={labels} highlight={cohortName || undefined} />
                ) : null}
                {companiesByYear.size > 0 ? (
                  <CohortYearsPanel byYear={companiesByYear} labels={labels} />
                ) : null}
                {cohorts.length > 0 ? <CohortPanel cohorts={cohorts} /> : null}
              </div>
            </Section>
          ) : null}

          {companies.length > 0 ? (
            <Section title="Learners by fellow">
              <div
                className={`grid grid-cols-1 items-start gap-card-gap ${shownCohorts.length > 1 ? 'xl:grid-cols-3' : ''}`}
              >
                {shownCohorts.map(([value]) => (
                  <CompanyPanel
                    key={value}
                    title={`${labels.valueLabel('cohort', value)} learners`}
                    rows={companies.filter((c) => c.cohort === value)}
                    slot={labels.valueSlot('cohort', value)}
                    labels={labels}
                    highlight={companyName || undefined}
                  />
                ))}
              </div>
              {companiesByYear.size > 1 ? (
                <CompanyTrendPanel
                  byYear={companiesByYear}
                  labels={labels}
                  include={(c) => !cohort || c.cohort === cohort}
                  only={company || undefined}
                />
              ) : null}
            </Section>
          ) : null}

          {allTimeTargets.length > 0 ? (
            <Section title="Programme targets">
              <div className="grid grid-cols-1 items-start gap-card-gap xl:grid-cols-2">
                <TargetPanel
                  title="Life of programme"
                  subtitle="What the fellowship was funded to reach, and where it stands"
                  rows={allTimeTargets}
                />
                {yearTargets.length > 0 ? (
                  <TargetPanel
                    title={`Against the ${yearTargets[0].year} target`}
                    subtitle="The same commitments, for this year alone"
                    rows={yearTargets}
                  />
                ) : null}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * One figure off a breakdown by exact dimensions — `{ cohort: '2', gender:
 * 'female' }` reads the cohort × gender breakdown's row for Cohort 2, female.
 */
function pick(metric: MetricSummary | undefined, match: Record<string, string>): number | null {
  const want = Object.keys(match).sort().join();
  const breakdown = metric?.breakdowns.find((b) => [...b.dimensions].sort().join() === want);
  const row = breakdown?.rows.find((r) => Object.entries(match).every(([k, v]) => r.dimensions[k] === v));
  return row ? row.value : null;
}

type Tile = { key: string; label: string; value: number | null; note?: string };

/** A uniform grid of figure tiles, each one exact. */
function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      {tiles.map((tile, i) => (
        <FigureTile
          key={tile.key}
          label={tile.label}
          value={tile.value}
          colour={seriesColor(i % SERIES.length)}
          exact={tile.value === null ? '' : formatValue(tile.value, 'count')}
          note={tile.note}
          showExact
        />
      ))}
    </div>
  );
}

type ViewProps = {
  /** The all-time summary: the cohort table and company columns are all-time figures. */
  metrics: Map<string, MetricSummary>;
  labels: ReturnType<typeof buildLabelIndex>;
  /** Every company, all time, with its cohort. */
  companies: CompanyFigure[];
  companiesByYear: Map<number, CompanyFigure[]>;
  /** Set when a year is picked, so the all-time figures say what they are. */
  yearPicked: boolean;
};

/**
 * One cohort's own page: the figures its row of the cohort table states, who
 * its learners are, and every fellow in it.
 */
function CohortView({ cohort, metrics, labels, companies, companiesByYear, yearPicked }: ViewProps & { cohort: string }) {
  const name = labels.valueLabel('cohort', cohort);
  const learnersMetric = metrics.get('edtech_learners_impacted');
  const learners = byValue(learnersMetric, 'cohort').get(cohort) ?? null;
  const note = yearPicked ? 'All time' : undefined;

  const reach = [
    { key: 'female', label: 'Female learners', value: pick(learnersMetric, { cohort, gender: 'female' }) },
    { key: 'rural', label: 'Rural learners', value: pick(learnersMetric, { cohort, inclusion: 'rural' }) },
    { key: 'pwd', label: 'Learners with a disability', value: pick(learnersMetric, { cohort, inclusion: 'pwd' }) },
    {
      key: 'displaced',
      label: 'Refugee / displaced learners',
      value: pick(learnersMetric, { cohort, inclusion: 'displaced' }),
    },
  ];

  const tiles: Tile[] = [
    { key: 'companies', label: 'Total companies', value: byValue(metrics.get('enterprises_total'), 'cohort').get(cohort) ?? null },
    { key: 'youth', label: 'Youth-led', value: byValue(metrics.get('enterprises_youth_led'), 'cohort').get(cohort) ?? null },
    { key: 'woman', label: 'Woman-led', value: pick(metrics.get('enterprises_total'), { cohort, gender: 'female' }) },
    { key: 'users', label: 'Total users', value: byValue(metrics.get('users_reached'), 'cohort').get(cohort) ?? null },
    { key: 'learners', label: 'Total learners', value: learners },
    ...reach,
  ].map((t) => ({ ...t, note }));

  const fellows = companies.filter((c) => c.cohort === cohort);

  return (
    <>
      <TileGrid tiles={tiles} />

      <Section title={`Who ${name} reaches`}>
        {/* Gender leads; the inclusion groups overlap, so each is read against all the cohort's learners. */}
        <Panel
          title={`${name} learners, by group`}
          subtitle="Each group as a share of the cohort's learners. The groups overlap, so they are never added together"
          table={{
            columns: [
              { key: 'label', label: 'Group' },
              { key: 'value', label: 'Learners', align: 'right' },
              { key: 'share', label: 'Of learners', align: 'right' },
            ],
            rows: reach.map((r) => ({
              label: r.label,
              value: formatValue(r.value, 'count'),
              share: r.value !== null && learners ? `${((r.value / learners) * 100).toFixed(1)}%` : '—',
            })),
          }}
        >
          <BarList
            unit="count"
            rows={reach
              .filter((r) => r.value !== null)
              .map((r, i) => ({
                name: r.label,
                value: r.value!,
                share: learners ? r.value! / learners : null,
                slot: i,
              }))}
          />
        </Panel>
      </Section>

      <Section title={`Fellows in ${name}`}>
        <FellowTable
          title={`${name} — every fellow`}
          fellows={fellows}
          metrics={metrics}
          labels={labels}
          companiesByYear={companiesByYear}
        />
        <div className="grid grid-cols-1 items-start gap-card-gap xl:grid-cols-2">
          <CompanyPanel
            title={`${name} learners`}
            rows={fellows}
            slot={labels.valueSlot('cohort', cohort)}
            labels={labels}
          />
          {companiesByYear.size > 1 ? (
            <CompanyTrendPanel byYear={companiesByYear} labels={labels} include={(c) => c.cohort === cohort} />
          ) : null}
        </div>
      </Section>
    </>
  );
}

/** One fellow's own page: its learners year by year, and who they are. */
function FellowView({ company, metrics, labels, companies, companiesByYear, yearPicked }: ViewProps & { company: string }) {
  const learnersMetric = metrics.get('edtech_learners_impacted');
  const own = companies.find((c) => c.company === company);
  const cohort = own?.cohort ?? '';
  const years = [...companiesByYear.keys()].sort((a, b) => a - b);
  const note = yearPicked ? 'All time' : undefined;

  const tiles: Tile[] = [
    { key: 'learners', label: 'Total learners', value: own?.value ?? null, note: cohort ? labels.valueLabel('cohort', cohort) : undefined },
    ...years.map((y) => ({
      key: `y${y}`,
      label: `Learners ${y}`,
      value: companiesByYear.get(y)?.find((c) => c.company === company)?.value ?? 0,
    })),
    { key: 'female', label: 'Female learners', value: pick(learnersMetric, { company, gender: 'female' }), note },
    { key: 'rural', label: 'Rural learners', value: pick(learnersMetric, { company, inclusion: 'rural' }), note },
    { key: 'pwd', label: 'Learners with a disability', value: pick(learnersMetric, { company, inclusion: 'pwd' }), note },
  ];

  return (
    <>
      <TileGrid tiles={tiles} />
      {companiesByYear.size > 1 ? (
        <CompanyTrendPanel byYear={companiesByYear} labels={labels} include={() => true} only={company} />
      ) : null}
      {cohort ? (
        <FellowTable
          title={`${labels.valueLabel('cohort', cohort)} — every fellow`}
          fellows={companies.filter((c) => c.cohort === cohort)}
          metrics={metrics}
          labels={labels}
          companiesByYear={companiesByYear}
          highlight={company}
        />
      ) : null}
    </>
  );
}

/** Every fellow in a cohort with every figure the sheet holds for it, and a totals row. */
function FellowTable({
  title,
  fellows,
  metrics,
  labels,
  companiesByYear,
  highlight,
}: {
  title: string;
  fellows: CompanyFigure[];
  metrics: Map<string, MetricSummary>;
  labels: ReturnType<typeof buildLabelIndex>;
  companiesByYear: Map<number, CompanyFigure[]>;
  highlight?: string;
}) {
  const learnersMetric = metrics.get('edtech_learners_impacted');
  const years = [...companiesByYear.keys()].sort((a, b) => a - b);

  const rows = [...fellows]
    .sort((a, b) => b.value - a.value)
    .map((f) => ({
      key: f.company,
      name: labels.valueLabel('company', f.company),
      years: years.map((y) => companiesByYear.get(y)?.find((c) => c.company === f.company)?.value ?? 0),
      total: f.value,
      female: pick(learnersMetric, { company: f.company, gender: 'female' }) ?? 0,
      rural: pick(learnersMetric, { company: f.company, inclusion: 'rural' }) ?? 0,
      pwd: pick(learnersMetric, { company: f.company, inclusion: 'pwd' }) ?? 0,
    }));

  const sum = (pickValue: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + pickValue(r), 0);
  const head = ['Fellow', ...years.map((y) => `Learners ${y}`), 'Total learners', 'Female', 'Rural', 'With a disability'];
  const cell = 'px-3 py-2 text-right tnum whitespace-nowrap';

  return (
    <Panel title={title} subtitle={`${rows.length} fellows, as the Fellowship tab records them`}>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-body-text">
          <thead>
            <tr className="border-b border-outline-variant text-left text-label-caps uppercase text-on-surface-muted">
              {head.map((h, i) => (
                <th key={h} className={`px-3 py-2 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.key}
                className="border-b border-outline-variant/60 text-on-surface"
                style={r.key === highlight ? { backgroundColor: `${BRAND}1f` } : undefined}
              >
                <td className="px-3 py-2 font-medium">{r.name}</td>
                {r.years.map((v, i) => (
                  <td key={years[i]} className={cell}>
                    {formatValue(v, 'count')}
                  </td>
                ))}
                <td className={`${cell} font-semibold`}>{formatValue(r.total, 'count')}</td>
                <td className={cell}>{formatValue(r.female, 'count')}</td>
                <td className={cell}>{formatValue(r.rural, 'count')}</td>
                <td className={cell}>{formatValue(r.pwd, 'count')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-on-surface">
              <td className="px-3 py-2">Total</td>
              {years.map((y, i) => (
                <td key={y} className={cell}>
                  {formatValue(sum((r) => r.years[i]), 'count')}
                </td>
              ))}
              <td className={cell}>{formatValue(sum((r) => r.total), 'count')}</td>
              <td className={cell}>{formatValue(sum((r) => r.female), 'count')}</td>
              <td className={cell}>{formatValue(sum((r) => r.rural), 'count')}</td>
              <td className={cell}>{formatValue(sum((r) => r.pwd), 'count')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

/** The figures below the cards, each one exact. */
const SECONDARY_KEYS = [
  'educators_using_edtech', 'partnerships', 'employees_hired', 'enterprises_total', 'monthly_revenue',
];

type FilterDef = {
  id: string;
  label: string;
  value: string;
  allLabel: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

/** One row of filters above everything they scope, as the master dashboard has. */
function FilterBar({ filters, onClear }: { filters: FilterDef[]; onClear?: () => void }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl sm:flex-row sm:items-stretch"
      style={{ backgroundColor: `${BRAND}1f` }}
    >
      <div className="flex items-center justify-between gap-3 bg-surface-container-lowest px-5 py-3 sm:justify-start">
        <span className="flex items-center gap-2 font-semibold text-on-surface-variant">
          <FunnelIcon />
          Filter
        </span>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-secondary-text font-medium underline-offset-2 hover:underline"
            style={{ color: BRAND }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {filters.map((f, i) => (
        <label
          key={f.id}
          htmlFor={f.id}
          className={`relative flex min-w-0 flex-1 items-center px-5 py-3 ${
            i > 0 ? 'border-t border-white/60 sm:border-l sm:border-t-0' : ''
          }`}
        >
          <span className="sr-only">{f.label}</span>
          <select
            id={f.id}
            value={f.value}
            onChange={(event) => f.onChange(event.target.value)}
            className="w-full cursor-pointer appearance-none bg-transparent pr-8 text-body-text text-on-surface focus:outline-none"
          >
            <option value="">{`${f.label}: ${f.allLabel}`}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-5 h-4 w-4 text-on-surface-variant" />
        </label>
      ))}
    </div>
  );
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function FunnelIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />
    </svg>
  );
}

/** The audiences side by side, so their scale against each other is plain. */
function AudiencePanel({ metrics }: { metrics: Map<string, MetricSummary> }) {
  const columns = [
    { key: 'users_reached', name: 'Users' },
    { key: 'active_users', name: 'Active users' },
    { key: 'edtech_learners_impacted', name: 'Learners' },
    { key: 'active_learners', name: 'Active learners' },
    { key: 'learners_outcomes', name: 'Outcomes achieved' },
  ]
    .map(({ key, name }) => ({ name, value: metrics.get(key)?.total ?? 0 }))
    .filter((c) => c.value > 0);

  if (columns.length === 0) return null;

  return (
    <Panel
      title="KPI relationship"
      subtitle="Users and learners reached, still active, and achieving outcomes — whole fellowship"
      table={{
        columns: [
          { key: 'name', label: 'Audience' },
          { key: 'value', label: 'Count', align: 'right' },
        ],
        rows: columns.map((c) => ({ name: c.name, value: formatValue(c.value, 'count') })),
      }}
    >
      <ColumnChart columns={columns} unit="count" height={240} />
    </Panel>
  );
}

/** Learners per cohort, one column each. */
function CohortLearnersPanel({
  cohorts,
  labels,
  highlight,
}: {
  cohorts: Array<[string, number]>;
  labels: ReturnType<typeof buildLabelIndex>;
  highlight?: string;
}) {
  const sum = cohorts.reduce((s, [, v]) => s + v, 0);
  const rows = cohorts.map(([value, learners]) => ({
    name: labels.valueLabel('cohort', value),
    value: learners,
    share: sum ? learners / sum : null,
    slot: labels.valueSlot('cohort', value),
  }));

  return (
    <Panel
      title="Learners by cohort"
      subtitle={`${formatValue(sum, 'count')} learners across ${cohorts.length} cohorts`}
      table={{
        columns: [
          { key: 'name', label: 'Cohort' },
          { key: 'value', label: 'Learners', align: 'right' },
          { key: 'share', label: 'Share', align: 'right' },
        ],
        rows: rows.map((r) => ({
          name: r.name,
          value: formatValue(r.value, 'count'),
          share: r.share === null ? '—' : `${(r.share * 100).toFixed(1)}%`,
        })),
      }}
    >
      <BarList unit="count" rows={rows} highlight={highlight} />
    </Panel>
  );
}

/**
 * Each cohort's learners, split by the year they were reached.
 *
 * The years are a true split of the all-time figure — the sheet's year columns
 * add to its total — so stacking them is honest here, where stacking the
 * overlapping inclusion groups would not be.
 */
function CohortYearsPanel({
  byYear,
  labels,
}: {
  byYear: Map<number, CompanyFigure[]>;
  labels: ReturnType<typeof buildLabelIndex>;
}) {
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const legend = years.map(String);
  const cohortKeys = [...new Set([...byYear.values()].flat().map((c) => c.cohort))].sort(
    (a, b) => labels.valueSlot('cohort', a) - labels.valueSlot('cohort', b)
  );

  const rows = cohortKeys.map((cohort) => {
    const perYear = years.map((y) =>
      (byYear.get(y) ?? []).filter((c) => c.cohort === cohort).reduce((s, c) => s + c.value, 0)
    );
    const rowTotal = perYear.reduce((s, v) => s + v, 0);
    return {
      name: labels.valueLabel('cohort', cohort),
      total: rowTotal,
      segments: perYear.map((value, i) => ({
        label: legend[i],
        value,
        share: rowTotal ? value / rowTotal : null,
      })),
    };
  });

  return (
    <Panel
      title="Cohorts by year"
      subtitle="When each cohort's learners were reached"
      table={{
        columns: [{ key: 'name', label: 'Cohort' }, ...legend.map((y) => ({ key: y, label: y, align: 'right' as const }))],
        rows: rows.map((r) => ({
          name: r.name,
          ...Object.fromEntries(r.segments.map((s) => [s.label, formatValue(s.value, 'count')])),
        })),
      }}
    >
      <div className="flex flex-col gap-4">
        <CompositionBar rows={rows} legend={legend} max={Math.max(...rows.map((r) => r.total), 0) || 1} />
        <CompositionLegend legend={legend} />
      </div>
    </Panel>
  );
}

/** One cohort's companies, largest first. */
function CompanyPanel({
  title,
  rows,
  slot,
  labels,
  highlight,
}: {
  title: string;
  rows: CompanyFigure[];
  slot: number;
  labels: ReturnType<typeof buildLabelIndex>;
  highlight?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const sum = sorted.reduce((s, r) => s + r.value, 0);

  return (
    <Panel
      title={title}
      subtitle={`${formatValue(sum, 'count')} learners across ${sorted.length} fellows`}
      table={{
        columns: [
          { key: 'company', label: 'Fellow' },
          { key: 'value', label: 'Learners', align: 'right' },
        ],
        rows: sorted.map((r) => ({
          company: labels.valueLabel('company', r.company),
          value: formatValue(r.value, 'count'),
        })),
      }}
    >
      <BarList
        unit="count"
        highlight={highlight && sorted.some((r) => labels.valueLabel('company', r.company) === highlight) ? highlight : undefined}
        rows={sorted.map((r) => ({
          name: labels.valueLabel('company', r.company),
          value: r.value,
          share: sum ? r.value / sum : null,
          slot,
        }))}
      />
    </Panel>
  );
}

/** The largest companies — or the one chosen — year by year. */
function CompanyTrendPanel({
  byYear,
  labels,
  include,
  only,
}: {
  byYear: Map<number, CompanyFigure[]>;
  labels: ReturnType<typeof buildLabelIndex>;
  include: (c: CompanyFigure) => boolean;
  only?: string;
}) {
  const years = [...byYear.keys()].sort((a, b) => a - b);

  const totals = new Map<string, number>();
  for (const rows of byYear.values())
    for (const r of rows) if (include(r)) totals.set(r.company, (totals.get(r.company) ?? 0) + r.value);
  const top = only
    ? [only]
    : [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, TREND_COMPANIES).map(([c]) => c);

  const data = years.map((y) => {
    const point: TrendPoint = { period: String(y) };
    for (const company of top) point[company] = (byYear.get(y) ?? []).find((r) => r.company === company)?.value ?? 0;
    return point;
  });

  return (
    <Panel
      title="Individual fellow learners"
      subtitle={
        only
          ? `${labels.valueLabel('company', only)}, year by year`
          : `The ${top.length} fellows with the most learners, year by year`
      }
      table={{
        columns: [
          { key: 'company', label: 'Fellow' },
          ...years.map((y) => ({ key: String(y), label: String(y), align: 'right' as const })),
        ],
        rows: top.map((company) => ({
          company: labels.valueLabel('company', company),
          ...Object.fromEntries(data.map((p) => [p.period, formatValue(Number(p[company]), 'count')])),
        })),
      }}
    >
      <TrendLine
        data={data}
        unit="count"
        height={280}
        seriesKeys={top.map((company, i) => ({
          key: company,
          label: labels.valueLabel('company', company),
          color: seriesColor(i),
        }))}
      />
    </Panel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-label-caps uppercase text-on-surface-muted">{title}</h2>
      {children}
    </section>
  );
}

/**
 * A target and the figure that answers it, as one bar each.
 *
 * The bar is the share of the target reached, so five commitments of very
 * different sizes can be read against each other at all — 2,614 of 25,920 and
 * 867,411 of 864,000 are the same question asked at two scales, and drawn to
 * their own magnitudes the smaller one would be invisible.
 */
function TargetPanel({ title, subtitle, rows }: { title: string; subtitle: string; rows: ProgramTarget[] }) {
  const disagreements = rows.filter(
    (r) => r.actual !== null && r.statedActual !== null && Math.abs(r.actual - r.statedActual) > 1
  );

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      table={{
        columns: [
          { key: 'label', label: 'Commitment' },
          { key: 'target', label: 'Target', align: 'right' },
          { key: 'actual', label: 'Actual', align: 'right' },
          { key: 'share', label: 'Of target', align: 'right' },
        ],
        rows: rows.map((row) => ({
          label: row.label,
          target: formatValue(row.target, 'count'),
          actual: row.actual === null ? '—' : formatValue(row.actual, 'count'),
          share: progress(row) === null ? '—' : `${(progress(row)! * 100).toFixed(1)}%`,
        })),
      }}
    >
      <ul className="flex flex-col gap-4">
        {rows.map((row) => {
          const share = progress(row);
          const met = share !== null && share >= 1;

          return (
            <li key={`${row.label}-${row.year ?? 'all'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-body-text font-medium text-on-surface">{row.label}</span>
                <span className="shrink-0 text-body-text text-on-surface-variant">
                  <span className="font-medium text-on-surface">
                    {row.actual === null ? '—' : formatValue(row.actual, 'count')}
                  </span>
                  <span className="mx-1.5 text-on-surface-muted">of</span>
                  {formatValue(row.target, 'count')}
                  {share === null ? null : (
                    <span className={`ml-2 font-medium ${met ? 'text-status-good' : 'text-on-surface-muted'}`}>
                      {(share * 100).toFixed(0)}%
                    </span>
                  )}
                </span>
              </div>

              <div
                className="mt-1.5 h-2.5 w-full overflow-hidden rounded"
                style={{ backgroundColor: '#f3f4f6' }}
                title={`${row.label}: ${row.actual === null ? 'not recorded' : formatValue(row.actual, 'count')} of ${formatValue(row.target, 'count')}`}
              >
                <div
                  className="h-full rounded"
                  style={{
                    // Capped at the target so a bar cannot run past its own
                    // track; the percentage beside it still says 100.4%.
                    width: `${Math.min((share ?? 0) * 100, 100)}%`,
                    backgroundColor: met ? seriesColor(3) : seriesColor(0),
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {disagreements.length > 0 ? (
        <p className="mt-5 border-t border-outline-variant pt-3 text-secondary-text text-on-surface-variant">
          The sheet states a different actual beside{' '}
          <span className="font-medium text-on-surface">{disagreements[0].label.toLowerCase()}</span> —{' '}
          {formatValue(disagreements[0].statedActual, 'count')} against the{' '}
          {formatValue(disagreements[0].actual, 'count')} its own figures record. Shown here from the figures.
        </p>
      ) : null}
    </Panel>
  );
}

/** Each audience as one bar, split by gender. */
function GenderPanel({
  metrics,
  labels,
}: {
  metrics: Map<string, MetricSummary>;
  labels: ReturnType<typeof buildLabelIndex>;
}) {
  const legend = ['Female', 'Male', 'Not disclose'];

  const rows = AUDIENCES.map(({ key, label }) => {
    const split = byValue(metrics.get(key), 'gender');
    const total = [...split.values()].reduce((sum, v) => sum + v, 0);

    return {
      name: label,
      total,
      segments: [...split.entries()].map(([value, count]) => ({
        label: labels.valueLabel('gender', value),
        value: count,
        share: total ? count / total : null,
      })),
    };
  }).filter((row) => row.total > 0);

  if (rows.length === 0) return null;

  return (
    <Panel
      title="Every audience, by gender"
      subtitle="Bar length is the size of the audience; the split is inside it"
      table={{
        columns: [
          { key: 'name', label: 'Audience' },
          ...legend.map((l) => ({ key: l, label: l, align: 'right' as const })),
        ],
        rows: rows.map((row) => ({
          name: row.name,
          ...Object.fromEntries(
            legend.map((l) => [
              l,
              formatValue(row.segments.find((s) => s.label === l)?.value ?? 0, 'count'),
            ])
          ),
        })),
      }}
    >
      <div className="flex flex-col gap-4">
        <CompositionBar
          rows={rows}
          legend={legend}
          max={Math.max(...rows.map((r) => r.total), 0) || 1}
        />
        <CompositionLegend legend={legend} />
      </div>
    </Panel>
  );
}

/** Reached against still active, for the two audiences that report both. */
function ReachedActivePanel({ metrics }: { metrics: Map<string, MetricSummary> }) {
  const slices = AUDIENCES.filter((a) => a.active)
    .map(({ key, active, label }) => {
      const reached = metrics.get(key)?.total ?? 0;
      const still = metrics.get(active!)?.total ?? 0;
      return { label, reached, active: still, share: reached ? still / reached : 0 };
    })
    .filter((row) => row.reached > 0);

  if (slices.length === 0) return null;

  return (
    <Panel
      title="Reached, and still active"
      subtitle="The active are a subset of the reached, never added to them"
      table={{
        columns: [
          { key: 'label', label: 'Audience' },
          { key: 'reached', label: 'Reached', align: 'right' },
          { key: 'active', label: 'Still active', align: 'right' },
          { key: 'share', label: 'Share', align: 'right' },
        ],
        rows: slices.map((row) => ({
          label: row.label,
          reached: formatValue(row.reached, 'count'),
          active: formatValue(row.active, 'count'),
          share: `${(row.share * 100).toFixed(1)}%`,
        })),
      }}
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {slices.map((row) => (
          <div key={row.label} className="flex flex-col items-center gap-2">
            <DonutChart
              compact
              slices={[
                { name: 'Still active', value: row.active, slot: 0 },
                { name: 'No longer active', value: Math.max(row.reached - row.active, 0), slot: 4 },
              ]}
              centerLabel={row.label.toLowerCase()}
            />
            <p className="text-center text-secondary-text text-on-surface-variant">
              <span className="font-medium text-on-surface">{(row.share * 100).toFixed(1)}%</span> of{' '}
              {formatValue(row.reached, 'count')} {row.label.toLowerCase()} still active
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/**
 * Reach into under-served groups.
 *
 * One panel per audience rather than one chart for all of them, because these
 * groups overlap — a learner can be counted as rural and as living with a
 * disability — so they are not parts of a whole and must not be stacked or
 * ringed. Each bar is read against its own audience's total, which is the only
 * comparison that means anything here.
 */
function InclusionPanel({
  metrics,
  labels,
}: {
  metrics: Map<string, MetricSummary>;
  labels: ReturnType<typeof buildLabelIndex>;
}) {
  const panels = [...AUDIENCES, { key: 'learners_outcomes', active: null, label: 'Achieved outcomes' }]
    .map(({ key, label }) => {
      const metric = metrics.get(key);
      const split = byValue(metric, 'inclusion');
      const total = metric?.total ?? 0;

      return {
        label,
        total,
        rows: [...split.entries()]
          .sort((a, b) => labels.valueSlot('inclusion', a[0]) - labels.valueSlot('inclusion', b[0]))
          .map(([value, count]) => ({
            name: labels.valueLabel('inclusion', value),
            value: count,
            share: total ? count / total : null,
            slot: labels.valueSlot('inclusion', value),
          })),
      };
    })
    .filter((panel) => panel.rows.length > 0);

  if (panels.length === 0) return null;

  return (
    <Panel
      title="Reach into under-served groups"
      subtitle="Each figure against its own audience. The groups overlap, so they are never added together"
      table={{
        columns: [
          { key: 'audience', label: 'Audience' },
          { key: 'group', label: 'Group' },
          { key: 'value', label: 'Count', align: 'right' },
          { key: 'share', label: 'Of audience', align: 'right' },
        ],
        rows: panels.flatMap((panel) =>
          panel.rows.map((row) => ({
            audience: panel.label,
            group: row.name,
            value: formatValue(row.value, 'count'),
            share: row.share === null ? '—' : `${(row.share * 100).toFixed(1)}%`,
          }))
        ),
      }}
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
        {panels.map((panel) => (
          <div key={panel.label} className="min-w-0">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <span className="truncate text-body-text font-medium text-on-surface">{panel.label}</span>
              <span className="shrink-0 text-secondary-text text-on-surface-muted">{formatValue(panel.total, 'count')}</span>
            </div>
            <BarList rows={panel.rows} unit="count" scale="max" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The cohorts, and how much of each is youth-led. */
function CohortPanel({
  cohorts,
}: {
  cohorts: Array<{ key: string; name: string; companies: number; youthLed: number }>;
}) {
  const total = cohorts.reduce((sum, c) => sum + c.companies, 0);
  const youthLed = cohorts.reduce((sum, c) => sum + c.youthLed, 0);
  const legend = ['Youth-led', 'Other'];

  return (
    <Panel
      title="The cohorts"
      subtitle={`${total} companies across ${cohorts.length} cohorts, ${youthLed} of them youth-led`}
      table={{
        columns: [
          { key: 'name', label: 'Cohort' },
          { key: 'companies', label: 'Companies', align: 'right' },
          { key: 'youthLed', label: 'Youth-led', align: 'right' },
        ],
        rows: cohorts.map((c) => ({
          name: c.name,
          companies: String(c.companies),
          youthLed: String(c.youthLed),
        })),
      }}
    >
      <div className="flex flex-col gap-4">
        <CompositionBar
          rows={cohorts.map((c) => ({
            name: c.name,
            total: c.companies,
            segments: [
              { label: 'Youth-led', value: c.youthLed, share: c.companies ? c.youthLed / c.companies : null },
              {
                label: 'Other',
                value: c.companies - c.youthLed,
                share: c.companies ? (c.companies - c.youthLed) / c.companies : null,
              },
            ],
          }))}
          legend={legend}
          max={Math.max(...cohorts.map((c) => c.companies), 0) || 1}
        />
        <CompositionLegend legend={legend} />
      </div>
    </Panel>
  );
}
