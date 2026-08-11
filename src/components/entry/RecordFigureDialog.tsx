import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useCreateFact, useDimensions, useMetrics, usePrograms, flattenPrograms } from '../../hooks/useData';
import { errorMessage, type Dimension, type ProgramNode } from '../../lib/api';

/**
 * Manual entry — the path by which data is recorded from here on.
 *
 * The form is generated from the metric catalog: choosing a metric determines
 * which breakdowns are offered and how the value is labelled. Adding a metric
 * in the backend therefore makes it enterable here with no frontend change.
 *
 * Writes go through the append-only API, so saving over an existing figure
 * revises it and keeps the previous value in history rather than destroying it.
 */
export function RecordFigureDialog({
  open,
  onClose,
  initialMetric,
  initialProgram,
}: {
  open: boolean;
  onClose: () => void;
  initialMetric?: string;
  initialProgram?: string;
}) {
  const { data: metrics = [] } = useMetrics();
  const { data: programs = [] } = usePrograms();
  const { data: dimensions = [] } = useDimensions();
  const createFact = useCreateFact();

  const [metricKey, setMetricKey] = useState(initialMetric ?? '');
  const [programKey, setProgramKey] = useState(initialProgram ?? '');
  const [periodType, setPeriodType] = useState<'all_time' | 'year' | 'month'>('all_time');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('1');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [dimensionValues, setDimensionValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMetricKey(initialMetric ?? '');
    setProgramKey(initialProgram ?? '');
    setValue('');
    setNote('');
    setDimensionValues({});
    setResult(null);
    createFact.reset();
  }, [open, initialMetric, initialProgram]);

  // Only programmes that hold facts — container nodes roll up their children
  // and the API rejects writes to them.
  const reportable = useMemo(
    () => flattenPrograms<ProgramNode>(programs).filter((p) => p.isReportable),
    [programs]
  );

  const metric = metrics.find((m) => m.key === metricKey);
  const availableDimensions = useMemo(
    () => dimensions.filter((d) => metric?.allowedDimensions.includes(d.name)),
    [dimensions, metric]
  );

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setResult(null);

    const cleanedDimensions = Object.fromEntries(
      Object.entries(dimensionValues).filter(([, v]) => v !== '')
    );

    try {
      const response = await createFact.mutateAsync({
        program: programKey,
        metric: metricKey,
        periodType,
        ...(periodType !== 'all_time' ? { year: Number(year) } : {}),
        ...(periodType === 'month' ? { month: Number(month) } : {}),
        ...(Object.keys(cleanedDimensions).length ? { dimensions: cleanedDimensions } : {}),
        value: Number(value),
        ...(note ? { note } : {}),
      });

      setResult(
        response.outcome === 'unchanged'
          ? 'That figure was already recorded — nothing changed.'
          : response.outcome === 'updated'
            ? 'Figure revised. The previous value is kept in history.'
            : 'Figure recorded.'
      );
      setValue('');
    } catch {
      // Surfaced from the mutation's error state below.
    }
  }

  const canSubmit = metricKey && programKey && value !== '' && !createFact.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-slate-900/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-figure-title"
        className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-surface shadow-soft"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="record-figure-title" className="text-sm font-semibold text-ink">
              Record a figure
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Saved figures are versioned — revising one keeps the old value in history.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
          <Field label="Metric" htmlFor="metric">
            <select id="metric" required value={metricKey} onChange={(e) => { setMetricKey(e.target.value); setDimensionValues({}); }} className={selectClass}>
              <option value="">Choose a metric…</option>
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.headlineLabel ?? m.label}
                </option>
              ))}
            </select>
            {metric?.description ? (
              <p className="mt-1 text-[0.68rem] leading-snug text-ink-muted">{metric.description}</p>
            ) : null}
          </Field>

          <Field label="Programme" htmlFor="program">
            <select id="program" required value={programKey} onChange={(e) => setProgramKey(e.target.value)} className={selectClass}>
              <option value="">Choose a programme…</option>
              {reportable.map((p) => (
                <option key={p.pageKey} value={p.pageKey}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Period" htmlFor="periodType">
              <select id="periodType" value={periodType} onChange={(e) => setPeriodType(e.target.value as typeof periodType)} className={selectClass}>
                <option value="all_time">All time</option>
                <option value="year">A year</option>
                <option value="month">A month</option>
              </select>
            </Field>

            {periodType !== 'all_time' ? (
              <Field label="Year" htmlFor="year">
                <input id="year" type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} />
              </Field>
            ) : null}
          </div>

          {periodType === 'month' ? (
            <Field label="Month" htmlFor="month">
              <select id="month" value={month} onChange={(e) => setMonth(e.target.value)} className={selectClass}>
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {availableDimensions.length > 0 ? (
            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted">
                Breakdown (optional)
              </legend>
              <p className="mb-2 text-[0.68rem] leading-snug text-ink-muted">
                Leave blank to record the programme's overall figure. Choose a value to record just
                that slice — totals are calculated from whichever you record.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableDimensions.map((dimension) => (
                  <DimensionInput
                    key={dimension.name}
                    dimension={dimension}
                    value={dimensionValues[dimension.name] ?? ''}
                    onChange={(next) =>
                      setDimensionValues((prev) => ({ ...prev, [dimension.name]: next }))
                    }
                  />
                ))}
              </div>
            </fieldset>
          ) : null}

          <Field label={metric?.unit === 'percent' ? 'Value (%)' : metric?.unit === 'currency' ? 'Value (USD)' : 'Value'} htmlFor="value">
            <input
              id="value"
              type="number"
              step="any"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Note (optional)" htmlFor="note">
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Where this figure came from"
              className={inputClass}
            />
          </Field>

          {createFact.isError ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage(createFact.error)}
            </p>
          ) : null}

          {result ? (
            <p role="status" className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">
              {result}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:bg-slate-50">
              Done
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {createFact.isPending ? 'Saving…' : 'Save figure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * One breakdown field.
 *
 * A closed axis (gender, platform, channel) is a strict dropdown — its values
 * are fixed and a typo should be impossible. An open axis (cohort, hub, region,
 * sector) is a combobox: pick an existing value or type a new one. Cohorts keep
 * being added, so the form must not cap them at whatever was seeded — the API
 * registers anything new against the catalog on save.
 */
function DimensionInput({
  dimension,
  value,
  onChange,
}: {
  dimension: Dimension;
  value: string;
  onChange: (value: string) => void;
}) {
  const listId = `dim-${dimension.name}`;
  const sorted = [...dimension.values].sort((a, b) => a.order - b.order);
  const isNew = value !== '' && !sorted.some((v) => v.value === value || v.label.toLowerCase() === value.toLowerCase());

  if (dimension.isClosed) {
    return (
      <label className="block">
        <span className="text-[0.68rem] font-medium text-ink-secondary">{dimension.label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
          <option value="">All</option>
          {sorted.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-[0.68rem] font-medium text-ink-secondary">
        {dimension.label}
        <span className="ml-1 font-normal text-ink-muted">· or type a new one</span>
      </span>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="All"
        className={inputClass}
      />
      <datalist id={listId}>
        {sorted.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </datalist>
      {isNew ? (
        <span className="mt-1 block text-[0.62rem] text-brand-dark">
          “{value}” is new — it will be added to {dimension.label.toLowerCase()}.
        </span>
      ) : null}
    </label>
  );
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30';
const selectClass = `${inputClass} bg-white`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}
