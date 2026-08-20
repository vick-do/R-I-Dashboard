import { Link } from 'react-router-dom';
import { useDataQuality } from '../hooks/useData';
import { errorMessage, type QualityIssue } from '../lib/api';
import { formatValue } from '../lib/format';
import { usePeriod } from '../lib/period';
import { PageHeader } from '../components/layout/DashboardLayout';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Panel } from '../components/ui/Panel';
import { WarningIcon } from '../components/ui/Icons';
import { FilterSelect } from '../components/ui/FilterSelect';
import { useState } from 'react';

const KIND_LABELS: Record<string, string> = {
  conflicting_values: 'Conflicting figures',
  incomplete_breakdown: 'Incomplete breakdowns',
  reconciliation_failed: 'Failed reconciliations',
};

/**
 * Where the recorded data disagrees with itself.
 */
export function DataQualityPage() {
  const { year } = usePeriod();
  const quality = useDataQuality(year);
  const [kind, setKind] = useState('all');

  if (quality.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (quality.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(quality.error)} onRetry={() => void quality.refetch()} />
      </Card>
    );
  }

  const { issues: allIssues, counts, coverage } = quality.data!;
  const kinds = [...new Set(allIssues.map((i) => i.kind))];
  const issues = kind === 'all' ? allIssues : allIssues.filter((i) => i.kind === kind);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data quality"
        subtitle={
          counts.total === 0
            ? 'Every recorded breakdown agrees with its total'
            : `${counts.total} issue${counts.total === 1 ? '' : 's'} found in the recorded data`
        }
      />

      <div className="grid grid-cols-2 gap-card-gap sm:grid-cols-4">
        <Stat label="Conflicting figures" value={counts.errors} tone={counts.errors ? 'danger' : 'ok'} />
        <Stat label="Failed reconciliations" value={counts.warnings} tone={counts.warnings ? 'warning' : 'ok'} />
        <Stat label="Programmes reporting" value={coverage.programs.filter((p) => p.recorded.length > 0).length} />
        <Stat label="Metrics in catalog" value={coverage.metrics.length} />
      </div>

      {allIssues.length > 1 && kinds.length > 1 ? (
        <FilterSelect
          id="quality-kind"
          label="Showing"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'All issues', count: allIssues.length },
            ...kinds.map((k) => ({
              value: k,
              label: KIND_LABELS[k] ?? k,
              count: allIssues.filter((i) => i.kind === k).length,
            })),
          ]}
        />
      ) : null}

      {issues.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing disagrees"
            hint="Every programme whose breakdown could be checked against a total matches it."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-card-gap">
          {issues.map((issue, index) => (
            <IssueCard key={`${issue.kind}-${index}`} issue={issue} />
          ))}
        </div>
      )}

      <CoverageGrid coverage={coverage} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'warning' | 'danger' | 'neutral';
}) {
  const colour =
    tone === 'danger'
      ? 'text-status-danger'
      : tone === 'warning'
        ? 'text-status-serious'
        : tone === 'ok'
          ? 'text-status-success'
          : 'text-on-surface';

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-card-padding">
      <p className="text-label-caps uppercase text-on-surface-muted">{label}</p>
      <p className={`mt-3 text-kpi-value ${colour}`}>{value}</p>
    </div>
  );
}

/**
 * A conflict shows every reading side by side rather than picking one. Which
 * figure is right is the R&I team's call, not the platform's.
 */
function IssueCard({ issue }: { issue: QualityIssue }) {
  const isError = issue.severity === 'error';
  const badge =
    issue.kind === 'conflicting_values'
      ? 'Conflict'
      : issue.kind === 'incomplete_breakdown'
        ? 'Incomplete breakdown'
        : 'Does not reconcile';

  return (
    <Card
      className={`overflow-hidden border-l-[3px] ${isError ? 'border-l-status-danger' : 'border-l-status-serious'}`}
    >
      <div className="flex flex-wrap items-start gap-3 p-card-padding">
        <WarningIcon
          className={`mt-0.5 h-5 w-5 shrink-0 ${isError ? 'text-status-danger' : 'text-status-serious'}`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-card-title text-on-surface">{issue.title}</h2>
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                isError
                  ? 'bg-status-danger-container text-status-on-danger-container'
                  : 'bg-status-warning-container text-status-on-warning-container'
              }`}
            >
              {badge}
            </span>
          </div>

          {issue.detail ? (
            <p className="mt-1.5 text-body-text text-on-surface-variant">{issue.detail}</p>
          ) : null}

          {issue.readings ? (
            <>
              <table className="mt-4 w-full border-collapse text-body-text">
                <thead>
                  <tr>
                    <th className="border-b border-outline-variant pb-2 text-left text-label-caps uppercase text-on-surface-muted">
                      Read from
                    </th>
                    <th className="border-b border-outline-variant pb-2 text-right text-label-caps uppercase text-on-surface-muted">
                      Gives
                    </th>
                    <th className="border-b border-outline-variant pb-2 text-right text-label-caps uppercase text-on-surface-muted">
                      Rows
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {issue.readings.map((reading) => (
                    <tr key={reading.basis}>
                      <td className="border-b border-outline-variant py-2.5 text-on-surface">{reading.basis}</td>
                      <td className="tnum border-b border-outline-variant py-2.5 text-right font-medium text-on-surface">
                        {formatValue(reading.value, issue.unit ?? 'count')}
                      </td>
                      <td className="tnum border-b border-outline-variant py-2.5 text-right text-on-surface-muted">
                        {reading.parts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-3 text-secondary-text text-on-surface-variant">
                {issue.kind === 'conflicting_values'
                  ? 'The dashboard shows the recorded total and marks any figure it had to sum. Which reading is correct is a decision for the source data, not for this page.'
                  : 'Nothing is wrong with the figures that were recorded — the breakdown simply does not cover everyone. Charts split by it will not add up to the programme total.'}
              </p>
            </>
          ) : null}

          {issue.sourceRef ? (
            <p className="mt-3 text-secondary-text text-on-surface-muted">Source: {issue.sourceRef}</p>
          ) : null}
        </div>

        {issue.programPageKey ? (
          <Link
            to={`/p/${issue.programPageKey}`}
            className="shrink-0 rounded-md border border-outline-variant px-3 py-1.5 text-secondary-text font-medium text-on-surface transition hover:bg-surface-variant"
          >
            Open {issue.programName}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

/** Which programmes report which metrics, and where the gaps are. */
function CoverageGrid({ coverage }: { coverage: NonNullable<ReturnType<typeof useDataQuality>['data']>['coverage'] }) {
  const reporting = coverage.programs.filter((p) => p.recorded.length > 0 || p.expected.length > 0);
  const metrics = coverage.metrics.filter((m) =>
    reporting.some((p) => p.recorded.includes(m.key) || p.expected.includes(m.key))
  );

  if (reporting.length === 0 || metrics.length === 0) return null;

  return (
    <Panel title="Coverage" subtitle="Which programmes have recorded which figures">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-secondary-text">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface-container-lowest pb-2 pr-4 text-left text-label-caps uppercase text-on-surface-muted">
                Programme
              </th>
              {metrics.map((m) => (
                <th key={m.key} className="px-1 pb-2 text-center align-bottom">
                  <span className="block max-w-[3.5rem] truncate text-xs text-on-surface-muted" title={m.label}>
                    {m.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reporting.map((program) => (
              <tr key={program.pageKey}>
                <td className="sticky left-0 whitespace-nowrap border-t border-outline-variant bg-surface-container-lowest py-2 pr-4 text-on-surface">
                  {program.name}
                </td>
                {metrics.map((m) => {
                  const has = program.recorded.includes(m.key);
                  const wanted = program.expected.includes(m.key);
                  return (
                    <td key={m.key} className="border-t border-outline-variant px-1 py-2 text-center">
                      <span
                        title={has ? 'Recorded' : wanted ? 'Expected but not recorded' : 'Not applicable'}
                        className={`inline-block h-3.5 w-3.5 rounded-sm ${
                          has ? 'bg-primary' : wanted ? 'bg-status-warning-container' : 'bg-surface-variant'
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-outline-variant pt-4 text-secondary-text text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-primary" /> Recorded
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-status-warning-container" /> Expected, not recorded
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-surface-variant" /> Not applicable
        </span>
      </div>
    </Panel>
  );
}
