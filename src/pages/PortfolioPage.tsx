import { useMemo } from 'react';
import { useProgramSummary, useDimensions } from '../hooks/useData';
import { errorMessage, type MetricSummary } from '../lib/api';
import { formatValue } from '../lib/format';
import { buildLabelIndex, type LabelIndex } from '../lib/labels';
import { SERIES, seriesColor } from '../lib/chart';
import { usePeriod } from '../lib/period';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Panel } from '../components/ui/Panel';
import { FigureTile, headline } from '../components/ui/FigureTile';
import { DonutChart } from '../components/charts/DonutChart';
import { CompositionBar, CompositionLegend } from '../components/charts/CompositionBar';

export const PORTFOLIO_PAGE_KEY = 'portfolio';

const ACTIVE = 'Active';
const REST = 'Not active';
const LEGEND = [ACTIVE, REST];

/** A breakdown, found by the exact axes it is cut along. */
function breakdown(metric: MetricSummary | undefined, dimensions: string[]) {
  return metric?.breakdowns.find(
    (b) => b.dimensions.length === dimensions.length && dimensions.every((d, i) => b.dimensions[i] === d)
  );
}

/** The value sitting under one dimension value, or zero. */
function valueOf(metric: MetricSummary | undefined, dimension: string, value: string): number {
  const rows = breakdown(metric, [dimension])?.rows ?? [];
  return rows.find((row) => row.dimensions[dimension] === value)?.value ?? 0;
}

/** The names on one roster, in alphabetical order. */
function roster(metric: MetricSummary | undefined, dimensions: string[], labels: LabelIndex): string[] {
  const rows = breakdown(metric, dimensions)?.rows ?? [];
  return rows
    .map((row) => labels.valueLabel('company', row.dimensions.company))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * The investment portfolio, as its own report.
 *
 * Every other page here counts people a programme reached. This one counts
 * companies MEST holds a stake in, which is a different kind of page: three
 * headline counts, a funding table reported twice over — once for the whole
 * portfolio since inception, once for the part of it still active — and three
 * rosters of company names that are the portfolio itself rather than a
 * breakdown of it.
 *
 * The active companies are a subset of the full portfolio, never a second half
 * of it, so everything here shows one inside the other and nothing adds them.
 */
export function PortfolioPage() {
  const { year } = usePeriod();
  const summary = useProgramSummary(PORTFOLIO_PAGE_KEY, year);
  const { data: dimensions = [] } = useDimensions();
  const labels = useMemo(() => buildLabelIndex(dimensions), [dimensions]);

  const metrics = summary.data?.metrics ?? [];
  const byKey = useMemo(() => new Map(metrics.map((m) => [m.key, m])), [metrics]);

  const view = useMemo(() => {
    const companies = byKey.get('enterprises_total');
    const promised = byKey.get('investment_promised');
    const disbursed = byKey.get('amount_invested');

    const total = companies?.total ?? 0;
    const active = valueOf(companies, 'venture_status', 'active');

    const full = roster(companies, ['company'], labels);
    const activeNames = roster(companies, ['company', 'venture_status'], labels);
    const femaleNames = roster(companies, ['company', 'gender'], labels);

    return {
      total,
      active,
      femaleLed: femaleNames.length,
      full,
      activeNames,
      femaleNames,
      activeSet: new Set(activeNames),
      funding: [
        {
          name: 'Investment promised',
          unit: promised,
          whole: promised?.total ?? 0,
          part: valueOf(promised, 'venture_status', 'active'),
        },
        {
          name: 'Funding disbursed',
          unit: disbursed,
          whole: disbursed?.total ?? 0,
          part: valueOf(disbursed, 'venture_status', 'active'),
        },
        { name: 'Portfolio companies', unit: companies, whole: total, part: active },
      ].filter((row) => row.whole > 0),
    };
  }, [byKey, labels]);

  if (summary.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (summary.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(summary.error)} onRetry={() => void summary.refetch()} />
      </Card>
    );
  }

  const { program } = summary.data!;

  return (
    <div className="space-y-8">
      <header className="min-w-0">
        <h1 className="text-page-title text-on-surface">{program.name}</h1>
        {program.description ? (
          <p className="mt-1.5 text-secondary-text text-on-surface-variant">{program.description}</p>
        ) : null}
      </header>

      {metrics.length === 0 ? (
        <Card>
          <EmptyState
            title={year ? `Nothing recorded for ${year}` : 'Nothing recorded yet'}
            hint="The portfolio is read from the Portfolio tab of the workbook."
          />
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FigureTile
              label="Total portfolio companies"
              value={view.total}
              colour={SERIES[0]}
              exact={String(view.total)}
            />
            <FigureTile label="Active companies" value={view.active} colour={SERIES[1]} exact={String(view.active)} />
            <FigureTile
              label="Female-led businesses"
              value={view.femaleLed}
              colour={SERIES[4]}
              exact={String(view.femaleLed)}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-label-caps uppercase text-on-surface-muted">Funding overview</h2>

            <Panel
                title="The whole portfolio, and the active part of it"
                subtitle="Bar length is the figure since inception; the darker share is what sits with companies still active"
                table={{
                  columns: [
                    { key: 'name', label: 'Measure' },
                    { key: 'whole', label: 'Since inception', align: 'right' },
                    { key: 'part', label: 'Active companies', align: 'right' },
                  ],
                  rows: view.funding.map((row) => ({
                    name: row.name,
                    whole: formatValue(row.whole, row.unit ?? 'count'),
                    part: formatValue(row.part, row.unit ?? 'count'),
                  })),
                }}
              >
                <div className="flex flex-col gap-4">
                  {/*
                    Each measure is scaled against its own figure rather than
                    against the tallest of the three: ninety-eight companies and
                    seven million dollars are not lengths that can be compared,
                    and drawn to one scale the company row would vanish.
                  */}
                  {view.funding.map((row) => (
                    <div key={row.name}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="text-body-text font-medium text-on-surface">{row.name}</span>
                        <span className="text-secondary-text text-on-surface-variant">
                          <span className="font-medium text-on-surface">
                            {formatValue(row.part, row.unit ?? 'count')}
                          </span>{' '}
                          of {formatValue(row.whole, row.unit ?? 'count')}
                        </span>
                      </div>
                      <CompositionBar
                        rows={[
                          {
                            name: row.name,
                            total: row.whole,
                            segments: [
                              { label: ACTIVE, value: row.part, share: row.part / row.whole },
                              {
                                label: REST,
                                value: row.whole - row.part,
                                share: (row.whole - row.part) / row.whole,
                              },
                            ],
                          },
                        ]}
                        legend={LEGEND}
                        unit={row.unit ?? 'count'}
                      />
                    </div>
                  ))}

                  <CompositionLegend legend={LEGEND} />
                </div>
              </Panel>

          </section>

          <section className="space-y-3">
            <h2 className="text-label-caps uppercase text-on-surface-muted">The businesses</h2>

            <div className="grid grid-cols-1 items-start gap-card-gap xl:grid-cols-2">
              <RosterPanel
                title="Female-led businesses"
                subtitle={`${view.femaleLed} of ${view.total} businesses in the portfolio`}
                names={view.femaleNames}
                colour={seriesColor(4)}
                share={{ part: view.femaleLed, whole: view.total, partLabel: 'Female-led' }}
              />

              <RosterPanel
                title="Active businesses"
                subtitle={`${view.active} companies currently operating`}
                names={view.activeNames}
                colour={seriesColor(1)}
                share={{ part: view.active, whole: view.total, partLabel: 'Active' }}
              />
            </div>

            <RosterPanel
              title="Full portfolio — businesses from inception"
              subtitle={`The ${view.active} companies still operating, of ${view.total} funded since inception`}
              names={view.activeNames}
              colour={seriesColor(0)}
              columns
            />
          </section>
        </>
      )}
    </div>
  );
}

/**
 * A roster of company names.
 *
 * Names, not bars. Each of these companies is one enterprise, so a chart of
 * them is ninety-seven bars of identical length — a list that has learnt to
 * look like a chart. The ring beside it carries the only quantity there is:
 * how much of the portfolio this roster is.
 */
function RosterPanel({
  title,
  subtitle,
  names,
  colour,
  share,
  marked,
  columns = false,
}: {
  title: string;
  subtitle: string;
  names: string[];
  colour: string;
  share?: { part: number; whole: number; partLabel: string };
  /** Names to mark as active, where the roster is the full portfolio. */
  marked?: Set<string>;
  /** Lay the names out in columns, for a roster too long to read as one run. */
  columns?: boolean;
}) {
  if (names.length === 0) return null;

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      table={{
        columns: [
          { key: 'name', label: 'Company' },
          ...(marked ? [{ key: 'status', label: 'Status' }] : []),
        ],
        rows: names.map((name) => ({
          name,
          ...(marked ? { status: marked.has(name) ? 'Active' : 'Not active' } : {}),
        })),
      }}
    >
      <div className={share ? 'flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8' : ''}>
        {share ? (
          <div className="shrink-0">
            <DonutChart
              compact
              slices={[
                { name: share.partLabel, value: share.part, slot: 0 },
                { name: 'Rest of portfolio', value: Math.max(share.whole - share.part, 0), slot: 4 },
              ]}
              centerLabel="of portfolio"
            />
          </div>
        ) : null}

        {/*
          A long roster reads down columns rather than wrapping across the full
          width: ninety-seven names in one run is a paragraph of proper nouns,
          and the eye has nowhere to rest. A short one wraps, which keeps five
          names on one line instead of five thin columns.
        */}
        <ul className={columns ? 'gap-2 sm:columns-2 xl:columns-3' : 'flex flex-wrap gap-2'}>
          {names.map((name) => {
            const active = marked?.has(name);
            return (
              <li
                key={name}
                className={`inline-flex max-w-full items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-secondary-text ${
                  marked && !active ? 'text-on-surface-variant' : 'text-on-surface'
                } ${columns ? 'mb-2 mr-2 break-inside-avoid' : ''}`}
                title={marked ? (active ? `${name} — still active` : `${name} — no longer active`) : name}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: marked && !active ? '#d1d5db' : colour }}
                />
                <span className="truncate">{name}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
