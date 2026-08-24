import { useMemo, useState } from 'react';
import {
  useCompare,
  useCompareGrouped,
  useFunnel,
  useScorecard,
  useDimensions,
} from '../hooks/useData';
import { errorMessage } from '../lib/api';
import { formatValue, humanise } from '../lib/format';
import { useAuth } from '../lib/auth';
import { usePeriod } from '../lib/period';
import { PageHeader } from '../components/layout/DashboardLayout';
import { StatTile } from '../components/ui/StatTile';
import { Card, EmptyState, ErrorState, Skeleton, Spinner } from '../components/ui/Card';
import { Panel } from '../components/ui/Panel';
import { BarList } from '../components/charts/BarList';
import { DonutChart } from '../components/charts/DonutChart';
import { CompositionBar, CompositionLegend } from '../components/charts/CompositionBar';
import { FunnelStages } from '../components/charts/FunnelStages';
import { RecordFigureDialog } from '../components/entry/RecordFigureDialog';

/**
 * Pan-African overview: the seven figures MEST reports on, in reporting order, then where they
 * come from.
 */

/**
 * A metric whose own catalog description flags it is read as unsettled.
 */
const UNCONFIRMED_MARKER = 'DEFINITION TO CONFIRM';

function definitionWarning(description: string | null): string | undefined {
  return description?.includes(UNCONFIRMED_MARKER) ? 'Definition unconfirmed' : undefined;
}

export function OverviewPage() {
  const { year } = usePeriod();
  const [recording, setRecording] = useState<string | null>(null);
  const { can } = useAuth();
  const canEdit = can('editor');

  const scorecard = useScorecard(year);
  const totals = scorecard.data?.totals ?? [];

  const unrecorded = totals.filter((t) => t.value === null).length;
  const reporting = Math.max(...totals.map((t) => t.programCount), 0);

  // The first four lead the row; the rest fill a second row of three, matching
  // the seven figures MEST reports rather than padding to a square grid.
  const lead = totals.slice(0, 4);
  const rest = totals.slice(4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impact Overview"
        subtitle={
          scorecard.isLoading
            ? 'Loading recorded figures…'
            : `Every figure is calculated from recorded data — ${reporting} programme${
                reporting === 1 ? '' : 's'
              } reporting${unrecorded ? `, ${unrecorded} of ${totals.length} figures not yet recorded` : ''}`
        }
        actions={
          canEdit ? (
            <button
              type="button"
              onClick={() => setRecording('')}
              className="rounded-md bg-primary px-4 py-2 text-body-text font-semibold text-on-primary transition hover:bg-primary-hover"
            >
              Record a figure
            </button>
          ) : null
        }
      />

      {/* ---------------------------------------------------------- scorecard */}
      {scorecard.isError ? (
        <Card>
          <ErrorState message={errorMessage(scorecard.error)} onRetry={() => void scorecard.refetch()} />
        </Card>
      ) : scorecard.isLoading ? (
        <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[148px]" />
          ))}
        </div>
      ) : (
        <div className="space-y-card-gap">
          <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 xl:grid-cols-4">
            {lead.map((total) => (
              <HeadlineTile key={total.key} total={total} canEdit={canEdit} onRecord={setRecording} />
            ))}
          </div>
          {rest.length > 0 ? (
            <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 xl:grid-cols-3">
              {rest.map((total) => (
                <HeadlineTile key={total.key} total={total} canEdit={canEdit} onRecord={setRecording} />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ------------------------------------------------ contribution + funnel */}
      <div className="grid grid-cols-1 items-start gap-card-gap lg:grid-cols-3">
        <TrainedByProgramme year={year} className="lg:col-span-2" />
        <TrainingFunnel year={year} />
      </div>

      {/* -------------------------------------------------------- composition */}
      <div className="grid grid-cols-1 items-start gap-card-gap lg:grid-cols-2">
        <LearnersByHub year={year} />
        <LearnersByGender year={year} />
      </div>

      <RecordFigureDialog
        open={recording !== null}
        onClose={() => setRecording(null)}
        initialMetric={recording || undefined}
      />
    </div>
  );
}

function HeadlineTile({
  total,
  canEdit,
  onRecord,
}: {
  total: NonNullable<ReturnType<typeof useScorecard>['data']>['totals'][number];
  canEdit: boolean;
  onRecord: (metricKey: string) => void;
}) {
  return (
    <StatTile
      label={total.label}
      value={total.value}
      unit={total}
      basis={total.basis}
      delta={total.delta}
      series={total.series}
      description={total.description}
      warning={definitionWarning(total.description)}
      detail={
        total.basis === 'partly_derived'
          ? `${total.programCount} programme${total.programCount === 1 ? '' : 's'} · partly summed`
          : `Across ${total.programCount} programme${total.programCount === 1 ? '' : 's'}`
      }
      onRecord={canEdit ? () => onRecord(total.key) : undefined}
    />
  );
}

/* ------------------------------------------------------------------ panels */

/** Cross-programme ranking. The rows are the same figures the KPI above sums. */
function TrainedByProgramme({ year, className }: { year: number | undefined; className?: string }) {
  const compare = useCompare('learners_total', year);

  if (compare.isLoading) {
    return (
      <Card className={className}>
        <Spinner label="Loading programme comparison" />
      </Card>
    );
  }
  if (compare.isError) {
    return (
      <Card className={className}>
        <ErrorState message={errorMessage(compare.error)} onRetry={() => void compare.refetch()} />
      </Card>
    );
  }

  const { rows, total } = compare.data!;

  if (rows.length === 0) {
    return (
      <Card className={className}>
        <EmptyState
          title="No learner figures recorded"
          hint="Record a figure or import a workbook to see how training breaks down across programmes."
        />
      </Card>
    );
  }

  return (
    <Panel
      title="People trained by programme"
      subtitle={`${year ?? 'All time'} · ${formatValue(total)} total`}
      className={className}
      table={{
        columns: [
          { key: 'name', label: 'Programme' },
          { key: 'value', label: 'Learners', align: 'right' },
          { key: 'share', label: 'Share', align: 'right' },
          { key: 'basis', label: 'Basis' },
        ],
        rows: rows.map((r) => ({
          name: r.name,
          value: formatValue(r.value),
          share: r.share != null ? `${(r.share * 100).toFixed(1)}%` : '—',
          basis: r.basis === 'derived_from_breakdown' ? 'Summed from breakdown' : 'Recorded total',
        })),
      }}
    >
      <DonutChart
        centerLabel="people trained"
        slices={rows.map((row) => ({
          name: row.name,
          value: row.value,
          derived: row.basis === 'derived_from_breakdown',
        }))}
      />
    </Panel>
  );
}

function TrainingFunnel({ year }: { year: number | undefined }) {
  const funnel = useFunnel(year);

  if (funnel.isLoading) {
    return (
      <Card>
        <Spinner label="Loading funnel" />
      </Card>
    );
  }
  if (funnel.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(funnel.error)} onRetry={() => void funnel.refetch()} />
      </Card>
    );
  }

  const stages = funnel.data ?? [];
  if (stages.length === 0) return null;

  return (
    <Panel
      title="Training funnel"
      table={{
        columns: [
          { key: 'stage', label: 'Stage' },
          { key: 'value', label: 'People', align: 'right' },
          { key: 'conversion', label: 'Conversion', align: 'right' },
        ],
        rows: stages.map((s) => ({
          stage: s.label,
          value: s.value === null ? 'Not recorded' : formatValue(s.value, s),
          conversion: s.conversion === null ? '—' : `${(s.conversion * 100).toFixed(1)}%`,
        })),
      }}
    >
      <div className="pt-2">
        <FunnelStages stages={stages} />
      </div>    </Panel>
  );
}

/** Where one programme's training happened. Pinned to the hub signature. */
function LearnersByHub({ year }: { year: number | undefined }) {
  const grouped = useCompareGrouped('learners_total', 'hub', year);
  const { data: dimensions = [] } = useDimensions();

  const hubLabels = useMemo(() => {
    const hub = dimensions.find((d) => d.name === 'hub');
    return new Map((hub?.values ?? []).map((v) => [v.value, v.label]));
  }, [dimensions]);

  if (grouped.isLoading) {
    return (
      <Card>
        <Spinner label="Loading hub breakdown" />
      </Card>
    );
  }
  if (grouped.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(grouped.error)} onRetry={() => void grouped.refetch()} />
      </Card>
    );
  }

  // Only programmes that actually recorded a hub breakdown come back.
  const programme = grouped.data?.rows[0];
  if (!programme) {
    return (
      <Panel title="Learners by hub">
        <EmptyState
          title="Nothing recorded by hub"
          hint="Record learners against a hub to see where training happens."
        />
      </Panel>
    );
  }

  const rows = programme.segments.map((segment) => ({
    name: hubLabels.get(segment.value) ?? humanise(segment.value),
    value: segment.amount,
  }));

  return (
    <Panel
      title={`Learners by hub — ${programme.name}`}
      table={{
        columns: [
          { key: 'name', label: 'Hub' },
          { key: 'value', label: 'Learners', align: 'right' },
        ],
        rows: rows.map((r) => ({ name: r.name, value: formatValue(r.value) })),
      }}
    >
      {/* No share printed here, so the track reads as the largest hub. */}
      <BarList rows={rows} scale="max" />
    </Panel>
  );
}

function LearnersByGender({ year }: { year: number | undefined }) {
  const grouped = useCompareGrouped('learners_total', 'gender', year);
  const { data: dimensions = [] } = useDimensions();

  const genderLabels = useMemo(() => {
    const gender = dimensions.find((d) => d.name === 'gender');
    return new Map((gender?.values ?? []).map((v) => [v.value, v.label]));
  }, [dimensions]);

  // The legend's order comes from the dimension catalog, so a segment keeps its
  // colour across every programme even when one records more men than women.
  const legendOrder = useMemo(() => {
    const gender = dimensions.find((d) => d.name === 'gender');
    return [...(gender?.values ?? [])].sort((a, b) => a.order - b.order).map((v) => v.label);
  }, [dimensions]);

  if (grouped.isLoading) {
    return (
      <Card>
        <Spinner label="Loading gender split" />
      </Card>
    );
  }
  if (grouped.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(grouped.error)} onRetry={() => void grouped.refetch()} />
      </Card>
    );
  }

  const rows = (grouped.data?.rows ?? []).map((row) => ({
    name: row.name,
    total: row.total,
    segments: row.segments.map((s) => ({
      label: genderLabels.get(s.value) ?? humanise(s.value),
      value: s.amount,
      share: s.share,
    })),
  }));

  if (rows.length === 0) {
    return (
      <Panel title="Learners by gender">
        <EmptyState
          title="Nothing recorded by gender"
          hint="Record learners against a gender to see the split here."
        />
      </Panel>
    );
  }

  const present = legendOrder.filter((label) => rows.some((row) => row.segments.some((s) => s.label === label)));

  return (
    <Panel
      title="Learners by gender"
      action={present.length > 1 ? <CompositionLegend legend={present} /> : undefined}
      table={{
        columns: [
          { key: 'name', label: 'Programme' },
          ...present.map((label) => ({ key: label, label, align: 'right' as const })),
          { key: 'total', label: 'Total', align: 'right' as const },
        ],
        rows: rows.map((row) => ({
          name: row.name,
          total: formatValue(row.total),
          ...Object.fromEntries(
            present.map((label) => {
              const segment = row.segments.find((s) => s.label === label);
              return [label, segment ? formatValue(segment.value) : '—'];
            })
          ),
        })),
      }}
    >
      <CompositionBar legend={present} rows={rows} />
    </Panel>
  );
}
