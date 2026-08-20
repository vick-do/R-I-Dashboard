import type { FunnelStage } from '../../lib/api';
import { CHART_INK, ORDINAL } from '../../lib/chart';
import { formatValue } from '../../lib/format';

/**
 * Ordered stages of one journey, as bars: enrolled → graduated → employed.
 */
export function FunnelStages({ stages }: { stages: FunnelStage[] }) {
  const first = stages.find((s) => s.value !== null)?.value ?? 0;

  return (
    <ol className="flex flex-col gap-4">
      {stages.map((stage, index) => {
        const missing = stage.value === null;
        const width = missing || !first ? 0 : Math.max((stage.value! / first) * 100, 0.5);

        return (
          <li key={stage.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-body-text ${missing ? 'text-on-surface-muted' : 'font-medium text-on-surface'}`}>
                {stage.label}
              </span>
              <span className="tnum shrink-0 text-body-text">
                <span className={missing ? 'text-on-surface-muted' : 'font-medium text-on-surface'}>
                  {missing ? '—' : formatValue(stage.value, stage.unit)}
                </span>
                {stage.conversion !== null ? (
                  <span className="ml-2 text-on-surface-muted">{(stage.conversion * 100).toFixed(1)}%</span>
                ) : null}
              </span>
            </div>

            <div
              className={`mt-1.5 h-2.5 w-full overflow-hidden rounded ${
                missing ? 'border border-dashed border-outline' : ''
              }`}
              style={{ backgroundColor: missing ? undefined : CHART_INK.track }}
            >
              {missing ? null : (
                <div
                  className="h-full rounded"
                  style={{
                    width: `${width}%`,
                    backgroundColor: ORDINAL[Math.min(index, ORDINAL.length - 1)],
                  }}
                />
              )}
            </div>

            <p className="mt-1.5 text-xs text-on-surface-muted">
              {missing
                ? 'Not yet recorded'
                : stage.conversion !== null
                  ? `of ${stages[index - 1]?.label.toLowerCase()}`
                  : `${stage.programCount} programme${stage.programCount === 1 ? '' : 's'} reporting`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
