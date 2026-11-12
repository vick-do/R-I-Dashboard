import { useMemo } from 'react';
import { useProgramSummary, useDimensions } from '../hooks/useData';
import { errorMessage, type AggregateRow, type MetricSummary } from '../lib/api';
import { formatValue } from '../lib/format';
import { buildLabelIndex } from '../lib/labels';
import { SERIES, seriesColor } from '../lib/chart';
import { usePeriod } from '../lib/period';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Panel } from '../components/ui/Panel';
import { FigureTile, headline } from '../components/ui/FigureTile';
import { TrendLine, type TrendPoint } from '../components/charts/TrendLine';
import { DonutChart } from '../components/charts/DonutChart';

export const EDTECH_PAGE_KEY = 'ecosystem-edtech-mondays';

/**
 * The figures across the top, in the order the season is usually read out:
 * the size of the audience first, then what it did, then how much was published.
 *
 * Named here rather than taken from the summary in catalog order, because this
 * row is a report someone reads top to bottom, not a list of everything stored.
 */
const HEADLINE_KEYS = [
  'impressions', 'reach', 'video_views', 'engagement', 'reactions',
  'clicks', 'shares', 'comments', 'posts', 'article_reach',
];

/** Wording for the tiles, where the metric's own label is longer than the space. */
const TILE_LABELS: Record<string, string> = {
  reach: 'Total reach',
  posts: 'Total posts',
};

/**
 * A colour per figure in the overview row.
 *
 * Decoration, and only decoration: ten single numbers have nothing for a hue
 * to encode, since none of them is a series and none shares an axis with
 * another. It is keyed to the metric rather than to the tile's position so a
 * figure keeps its colour if the row is ever reordered, and it is drawn from
 * the same validated palette as the charts rather than from ten hues invented
 * for the occasion — with the palette repeating past its sixth, which is what
 * an accent may do and an encoding may not.
 */
const accent = (key: string) => SERIES[HEADLINE_KEYS.indexOf(key) % SERIES.length];

/** The three measures plotted against each other over the season. */
const TREND_KEYS = ['impressions', 'reach', 'engagement'];

/** Two letters for a platform, the way each one is written about. */
const PLATFORM_CODES: Record<string, string> = {
  youtube: 'YT', facebook: 'FB', twitter: 'TW', linkedin: 'LI', instagram: 'IG',
};

/**
 * The order the source sheet lists them in, which is the order the season is
 * reported in. Anything the sheet grows later falls in behind, in catalog
 * order, rather than disappearing.
 */
const PLATFORM_ORDER = ['youtube', 'facebook', 'twitter', 'linkedin', 'instagram'];

const platformRank = (value: string, slot: number) => {
  const listed = PLATFORM_ORDER.indexOf(value);
  return listed === -1 ? PLATFORM_ORDER.length + slot : listed;
};

/** Rows of a breakdown, keyed by the dimension value they sit under. */
function byValue(metric: MetricSummary | undefined, dimension: string): Map<string, number> {
  const breakdown = metric?.breakdowns.find((b) => b.dimensions.length === 1 && b.dimension === dimension);
  return new Map((breakdown?.rows ?? []).map((row) => [row.dimensions[dimension], row.value]));
}

/**
 * The season by month, with the axis it was recorded against collapsed out.
 *
 * Every figure here is stored per channel per month, so the month's own total is
 * the channels added up. Summing is right for these and only these: they are
 * counts of separate things, never the same impression counted twice, which is
 * also why the channel view and the platform view are never added to each other.
 */
function monthlyTotals(metric: MetricSummary | undefined): Map<string, number> {
  const months = new Map<string, number>();
  for (const row of metric?.trend?.rows ?? []) {
    const label = row.periodLabel ?? '';
    if (!label) continue;
    months.set(label, (months.get(label) ?? 0) + row.value);
  }
  return months;
}

/**
 * Months in the order they happened.
 *
 * Sorted on the date each month starts, never on its name: "August" before
 * "February" is what sorting the labels gives you. The dates are gathered from
 * every measure rather than from one of them, so a month only one of the three
 * recorded still lands in the right place instead of falling back to its name.
 */
function seasonMonths(series: Array<Map<string, number>>, rows: AggregateRow[]): string[] {
  const startOf = new Map<string, string>();
  for (const row of rows) {
    if (row.periodLabel && row.periodStart) startOf.set(row.periodLabel, row.periodStart);
  }
  const seen = new Set(series.flatMap((m) => [...m.keys()]));
  return [...seen].sort((a, b) => (startOf.get(a) ?? a).localeCompare(startOf.get(b) ?? b));
}

/**
 * EdTech Mondays, as its own report.
 *
 * Every other programme answers "how many people, split how" and shares one page
 * template for it. This one is a season of broadcasting: ten measures of one
 * audience, the same season counted twice — once by channel, once by platform —
 * and a shape that reads as a monthly report rather than as a figure with
 * breakdowns under it. The generic page can show all of that, but only as ten
 * cards and a stack of panels, which is a different document.
 */
export function EdTechMondaysPage() {
  const { year } = usePeriod();
  const summary = useProgramSummary(EDTECH_PAGE_KEY, year);
  const { data: dimensions = [] } = useDimensions();
  const labels = useMemo(() => buildLabelIndex(dimensions), [dimensions]);

  const metrics = summary.data?.metrics ?? [];
  const byKey = useMemo(() => new Map(metrics.map((m) => [m.key, m])), [metrics]);

  const trend = useMemo(() => {
    const series = TREND_KEYS.map((key) => monthlyTotals(byKey.get(key)));
    const months = seasonMonths(series, TREND_KEYS.flatMap((key) => byKey.get(key)?.trend?.rows ?? []));

    return months.map((month): TrendPoint => {
      const point: TrendPoint = { period: month.split(' ')[0].slice(0, 3) };
      TREND_KEYS.forEach((key, index) => {
        const value = series[index].get(month);
        if (value !== undefined) point[byKey.get(key)?.label ?? key] = value;
      });
      return point;
    });
  }, [byKey]);

  const platforms = useMemo(() => {
    const impressions = byValue(byKey.get('impressions'), 'platform');

    return [...impressions.entries()]
      .sort(
        (a, b) =>
          platformRank(a[0], labels.valueSlot('platform', a[0])) -
          platformRank(b[0], labels.valueSlot('platform', b[0]))
      )
      .map(([value, total]) => ({
        value,
        name: labels.valueLabel('platform', value),
        code: PLATFORM_CODES[value] ?? labels.valueLabel('platform', value).slice(0, 2).toUpperCase(),
        // From the catalog slot, so a platform is the same colour here as in
        // any chart that ever splits by platform.
        colour: seriesColor(labels.valueSlot('platform', value)),
        impressions: total,
      }));
  }, [byKey, labels]);

  const channels = useMemo(() => {
    const impressions = byValue(byKey.get('impressions'), 'channel');
    return [...impressions.entries()]
      .map(([value, total]) => ({
        name: labels.valueLabel('channel', value),
        value: total,
        slot: labels.valueSlot('channel', value),
      }))
      // A channel that published nothing measurable has no arc to draw, and a
      // zero slice in a ring is a legend entry pretending to be a wedge.
      .filter((slice) => slice.value > 0)
      .sort((a, b) => a.slot - b.slot);
  }, [byKey, labels]);

  if (summary.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 xl:grid-cols-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
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
  const trendSeries = TREND_KEYS.map((key, index) => ({
    key: byKey.get(key)?.label ?? key,
    label: byKey.get(key)?.label ?? key,
    color: seriesColor(index),
  })).filter((s) => trend.some((point) => point[s.key] !== undefined));

  return (
    <div className="space-y-8">
      {/*
        No sync badge and no "last read" stamp here, by request. The state of
        the connection to the sheet is still on the Imports page, which is
        where it is acted on; this page is the report.
      */}
      <header className="min-w-0">
        <h1 className="text-page-title text-on-surface">{program.name} — consolidated report</h1>
        {program.description ? (
          <p className="mt-1.5 text-secondary-text text-on-surface-variant">{program.description}</p>
        ) : null}
      </header>

      {metrics.length === 0 ? (
        <Card>
          <EmptyState
            title={year ? `Nothing recorded for ${year}` : 'Nothing recorded yet'}
            hint="The season's figures are read from the consolidated tab of the workbook."
          />
        </Card>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-label-caps uppercase text-on-surface-muted">
              Overview — key metrics all platforms
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
              {HEADLINE_KEYS.map((key) => {
                const metric = byKey.get(key);
                if (!metric) return null;
                return (
                  <FigureTile
                    key={key}
                    label={TILE_LABELS[key] ?? metric.label}
                    value={metric.total}
                    colour={accent(key)}
                    exact={metric.total === null ? '' : formatValue(metric.total, metric)}
                  />
                );
              })}
            </div>
          </section>

          {platforms.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-label-caps uppercase text-on-surface-muted">
                Social media — impressions by platform
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {platforms.map((platform) => (
                  <PlatformCard key={platform.value} platform={platform} />
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid grid-cols-1 items-start gap-card-gap xl:grid-cols-[2fr_1fr]">
            {trend.length > 0 ? (
              <Panel
                title="The season month by month"
                subtitle="Impressions, reach and engagement — every channel added together"
                table={{
                  columns: [
                    { key: 'period', label: 'Month' },
                    ...trendSeries.map((s) => ({ key: s.key, label: s.label, align: 'right' as const })),
                  ],
                  rows: trend.map((point) => ({
                    period: String(point.period),
                    ...Object.fromEntries(
                      trendSeries.map((s) => [
                        s.key,
                        point[s.key] === undefined ? '—' : formatValue(point[s.key] as number, 'count'),
                      ])
                    ),
                  })),
                }}
              >
                {/*
                  All three are counts of the same kind of thing, so they share
                  one axis. Two scales on one plot would let engagement be drawn
                  as tall as impressions and call that a comparison.
                */}
                <TrendLine data={trend} seriesKeys={trendSeries} height={300} />
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {trendSeries.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 text-secondary-text text-on-surface-variant">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.label}
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            {channels.length > 0 ? (
              <Panel
                title="Impressions by channel"
                subtitle="Who broadcast the season"
                table={{
                  columns: [
                    { key: 'name', label: 'Channel' },
                    { key: 'value', label: 'Impressions', align: 'right' },
                  ],
                  rows: channels.map((c) => ({ name: c.name, value: formatValue(c.value, 'count') })),
                }}
              >
                <DonutChart slices={channels} centerLabel="impressions" />
              </Panel>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
}: {
  platform: { name: string; code: string; colour: string; impressions: number };
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-card-padding">
      <div className="flex items-center gap-2.5">
        {/*
          The chip is tinted rather than filled: at 7x7 a solid block of the
          series colour beside two more of them competes with the figure it is
          labelling, and the initials have to stay readable on it.
        */}
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
          style={{ backgroundColor: `${platform.colour}1f`, color: platform.colour }}
        >
          {platform.code}
        </span>
        <span className="min-w-0 truncate text-label-caps uppercase text-on-surface-muted">{platform.name}</span>
      </div>

      <div>
        <span className="block text-[26px] font-semibold leading-none tracking-tight text-on-surface">
          {headline(platform.impressions)}
        </span>
        <span className="mt-2 block text-secondary-text text-on-surface-variant">Total impressions</span>
      </div>
    </div>
  );
}
