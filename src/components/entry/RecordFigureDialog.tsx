import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useCreateFact, useDimensions, useMetrics, usePrograms, flattenPrograms } from '../../hooks/useData';
import { errorMessage, type Dimension, type Metric, type ProgramNode } from '../../lib/api';
import { formatValue } from '../../lib/format';
import { Field, inputClass, selectClass } from '../ui/Field';
import { Button } from '../ui/Button';
import { CloseIcon } from '../ui/Icons';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Step = 0 | 1 | 2;
const STEP_TITLES = ['What are you recording?', 'Which period and slice?', 'The number'];

/**
 * Manual entry, as three short steps rather than one long form.
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

  const [step, setStep] = useState<Step>(0);
  const [metricKey, setMetricKey] = useState('');
  const [programKey, setProgramKey] = useState('');
  const [periodType, setPeriodType] = useState<'all_time' | 'year' | 'month'>('all_time');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('1');
  const [scope, setScope] = useState<'whole' | 'slice'>('whole');
  const [dimensionValues, setDimensionValues] = useState<Record<string, string>>({});
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setMetricKey(initialMetric ?? '');
    setProgramKey(initialProgram ?? '');
    setPeriodType('all_time');
    setScope('whole');
    setDimensionValues({});
    setValue('');
    setNote('');
    setSaved(null);
    createFact.reset();
  }, [open, initialMetric, initialProgram]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Container nodes roll up their children and the API rejects writes to them.
  const reportable = useMemo(
    () => flattenPrograms<ProgramNode>(programs).filter((p) => p.isReportable),
    [programs]
  );

  const metric = metrics.find((m) => m.key === metricKey);
  const programme = reportable.find((p) => p.pageKey === programKey);
  const availableDimensions = useMemo(
    () => dimensions.filter((d) => metric?.allowedDimensions.includes(d.name)),
    [dimensions, metric]
  );

  const chosenSlices = Object.entries(dimensionValues).filter(([, v]) => v !== '');

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(null);

    try {
      const response = await createFact.mutateAsync({
        program: programKey,
        metric: metricKey,
        periodType,
        ...(periodType !== 'all_time' ? { year: Number(year) } : {}),
        ...(periodType === 'month' ? { month: Number(month) } : {}),
        ...(scope === 'slice' && chosenSlices.length ? { dimensions: Object.fromEntries(chosenSlices) } : {}),
        value: Number(value),
        ...(note ? { note } : {}),
      });

      setSaved(
        response.outcome === 'unchanged'
          ? 'That figure was already recorded — nothing changed.'
          : response.outcome === 'updated'
            ? 'Figure revised. The previous value is kept in history.'
            : 'Figure recorded.'
      );
    } catch {
    }
  }

  const canAdvance =
    step === 0
      ? Boolean(metricKey && programKey)
      : step === 1
        ? scope === 'whole' || chosenSlices.length > 0
        : true;
  const canSave = Boolean(metricKey && programKey && value !== '') && !createFact.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-on-surface/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-figure-title"
        className="relative w-full max-w-[560px] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-floating"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id="record-figure-title" className="text-section-header text-on-surface">
              Record a figure
            </h2>
            <p className="mt-1 text-secondary-text text-on-surface-variant">
              Step {step + 1} of 3 — {STEP_TITLES[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-md p-1.5 text-on-surface-muted transition hover:bg-surface-variant hover:text-on-surface"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex gap-1.5 px-6 pt-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-surface-variant'}`}
            />
          ))}
        </div>

        {saved ? (
          <Saved
            message={saved}
            summary={
              <Summary
                metric={metric}
                programme={programme?.name}
                periodType={periodType}
                year={year}
                month={month}
                scope={scope}
                slices={chosenSlices}
                dimensions={dimensions}
                value={value}
              />
            }
            onAnother={() => {
              setValue('');
              setNote('');
              setSaved(null);
              setStep(2);
              createFact.reset();
            }}
            onClose={onClose}
          />
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5 px-6 py-5">
            {step === 0 ? (
              <>
                <Field label="Which figure?" htmlFor="metric" hint={metric?.description ?? undefined}>
                  <select
                    id="metric"
                    value={metricKey}
                    onChange={(e) => {
                      setMetricKey(e.target.value);
                      setDimensionValues({});
                      setScope('whole');
                    }}
                    className={selectClass}
                  >
                    <option value="">Choose…</option>
                    {metrics.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.headlineLabel ?? m.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="For which programme?" htmlFor="program">
                  <select
                    id="program"
                    value={programKey}
                    onChange={(e) => setProgramKey(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Choose…</option>
                    {reportable.map((p) => (
                      <option key={p.pageKey} value={p.pageKey}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Field label="Which period does it cover?" htmlFor="periodType">
                  <div className="flex gap-2">
                    <select
                      id="periodType"
                      value={periodType}
                      onChange={(e) => setPeriodType(e.target.value as typeof periodType)}
                      className={selectClass}
                    >
                      <option value="all_time">All time</option>
                      <option value="year">A whole year</option>
                      <option value="month">A single month</option>
                    </select>

                    {periodType === 'month' ? (
                      <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectClass}>
                        {MONTHS.map((name, index) => (
                          <option key={name} value={index + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {periodType !== 'all_time' ? (
                      <input
                        type="number"
                        min={2000}
                        max={2100}
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        aria-label="Year"
                        className={`${inputClass} w-28 tnum`}
                      />
                    ) : null}
                  </div>
                </Field>

                {availableDimensions.length > 0 ? (
                  <fieldset className="flex flex-col gap-3">
                    <legend className="mb-1 text-secondary-text font-medium text-on-surface">
                      Is this the whole programme, or one slice of it?
                    </legend>

                    <ScopeOption
                      checked={scope === 'whole'}
                      onChange={() => {
                        setScope('whole');
                        setDimensionValues({});
                      }}
                      title={`The whole of ${programme?.name ?? 'the programme'}`}
                      hint="One overall figure covering everyone."
                    />
                    <ScopeOption
                      checked={scope === 'slice'}
                      onChange={() => setScope('slice')}
                      title="One slice of it"
                      hint={`Just ${availableDimensions.map((d) => d.label.toLowerCase()).slice(0, 3).join(', ')}${
                        availableDimensions.length > 3 ? ', …' : ''
                      } — record each slice separately and totals add up on their own.`}
                    />

                    {scope === 'slice' ? (
                      <div className="grid grid-cols-1 gap-3 rounded-md border border-outline-variant p-4 sm:grid-cols-2">
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
                    ) : null}
                  </fieldset>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Field
                  label={
                    metric?.unit === 'percent'
                      ? 'What is the figure? (%)'
                      : metric?.unit === 'currency'
                        ? 'What is the figure? (USD)'
                        : 'What is the figure?'
                  }
                  htmlFor="value"
                >
                  <input
                    id="value"
                    type="number"
                    step="any"
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className={`${inputClass} tnum text-[20px] font-semibold`}
                  />
                </Field>

                <Field label="Where did it come from? (optional)" htmlFor="note">
                  <input
                    id="note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Cohort 6 registry, checked 11 August"
                    className={inputClass}
                  />
                </Field>
              </>
            ) : null}

            <div className="rounded-md bg-surface p-4">
              <p className="text-label-caps uppercase text-on-surface-muted">You are recording</p>
              <p className="mt-1.5 text-body-text leading-relaxed text-on-surface">
                <Summary
                  metric={metric}
                  programme={programme?.name}
                  periodType={periodType}
                  year={year}
                  month={month}
                  scope={scope}
                  slices={chosenSlices}
                  dimensions={dimensions}
                  value={value}
                />
              </p>
            </div>

            {createFact.isError ? (
              <p
                role="alert"
                className="rounded-md border border-status-danger/30 bg-status-danger-container px-3 py-2 text-secondary-text text-status-on-danger-container"
              >
                {errorMessage(createFact.error)}
              </p>
            ) : null}

            <div className="-mx-6 -mb-5 flex items-center justify-between gap-3 border-t border-outline-variant px-6 py-4">
              <Button variant="ghost" onClick={step === 0 ? onClose : () => setStep((s) => (s - 1) as Step)}>
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>

              {step < 2 ? (
                <Button variant="primary" disabled={!canAdvance} onClick={() => setStep((s) => (s + 1) as Step)}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" variant="primary" disabled={!canSave}>
                  {createFact.isPending ? 'Saving…' : 'Save figure'}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Plain-English restatement of the coordinate about to be written. */
function Summary({
  metric,
  programme,
  periodType,
  year,
  month,
  scope,
  slices,
  dimensions,
  value,
}: {
  metric: Metric | undefined;
  programme: string | undefined;
  periodType: 'all_time' | 'year' | 'month';
  year: string;
  month: string;
  scope: 'whole' | 'slice';
  slices: Array<[string, string]>;
  dimensions: Dimension[];
  value: string;
}) {
  if (!metric || !programme) return <span className="text-on-surface-muted">Choose a figure and a programme.</span>;

  const period =
    periodType === 'all_time' ? 'all time' : periodType === 'year' ? year : `${MONTHS[Number(month) - 1]} ${year}`;

  const sliceText =
    scope === 'slice' && slices.length
      ? slices
          .map(([name, raw]) => {
            const dimension = dimensions.find((d) => d.name === name);
            const label = dimension?.values.find((v) => v.value === raw)?.label ?? raw;
            return `${dimension?.label.toLowerCase() ?? name} ${label}`;
          })
          .join(', ')
      : null;

  return (
    <>
      <strong className="font-semibold">{metric.label}</strong> for <strong className="font-semibold">{programme}</strong>,{' '}
      {period}
      {sliceText ? (
        <>
          , limited to <strong className="font-semibold">{sliceText}</strong>
        </>
      ) : scope === 'slice' ? (
        <span className="text-on-surface-muted"> — now pick which slice</span>
      ) : (
        <> — the whole programme</>
      )}
      {value !== '' ? (
        <>
          {' '}
          = <strong className="font-semibold">{formatValue(Number(value), metric)}</strong>
        </>
      ) : (
        '.'
      )}
    </>
  );
}

function ScopeOption({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-md border p-3 transition ${
        checked ? 'border-primary bg-primary-container' : 'border-outline-variant hover:border-outline'
      }`}
    >
      <input type="radio" checked={checked} onChange={onChange} className="mt-1 accent-primary" />
      <span className="min-w-0">
        <span className="block text-body-text font-medium text-on-surface">{title}</span>
        <span className="mt-0.5 block text-secondary-text text-on-surface-variant">{hint}</span>
      </span>
    </label>
  );
}

function Saved({
  message,
  summary,
  onAnother,
  onClose,
}: {
  message: string;
  summary: React.ReactNode;
  onAnother: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 px-6 py-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-success-container">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-status-success" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-body-text font-medium text-on-surface">{message}</p>
          <p className="mt-1.5 text-secondary-text leading-relaxed text-on-surface-variant">{summary}</p>
        </div>
      </div>

      <div className="-mx-6 -mb-8 flex items-center justify-end gap-3 border-t border-outline-variant px-6 py-4">
        <Button variant="secondary" onClick={onAnother}>
          Record another
        </Button>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

/**
 * A closed axis is a strict dropdown — its values are fixed and a typo should be impossible.
 * An open axis is a combobox: pick an existing value or type a new one, because cohorts keep
 * being added and the form must not cap them at whatever was seeded.
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
  const isNew =
    value !== '' && !sorted.some((v) => v.value === value || v.label.toLowerCase() === value.toLowerCase());

  if (dimension.isClosed) {
    return (
      <Field label={dimension.label} htmlFor={`dim-input-${dimension.name}`}>
        <select
          id={`dim-input-${dimension.name}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          <option value="">Any</option>
          {sorted.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <Field
      label={dimension.label}
      htmlFor={`dim-input-${dimension.name}`}
      hint={
        isNew ? (
          <span className="text-on-primary-container">
            “{value}” is new — it will be added to {dimension.label.toLowerCase()}.
          </span>
        ) : undefined
      }
    >
      <input
        id={`dim-input-${dimension.name}`}
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Any"
        className={inputClass}
      />
      <datalist id={listId}>
        {sorted.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </datalist>
    </Field>
  );
}
