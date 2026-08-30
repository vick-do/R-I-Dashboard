import { useEffect, useState, type FormEvent } from 'react';
import { useCreateFact } from '../../hooks/useData';
import { errorMessage } from '../../lib/api';
import { Field, inputClass, selectClass } from '../ui/Field';
import { Button } from '../ui/Button';
import { CloseIcon } from '../ui/Icons';

/**
 * Grow's own entry form.
 *
 * The general dialog asks three questions before it will take a number —
 * which metric, which programme, which slice — because it has to serve every
 * programme in the catalog. Grow reports the same shape every single time: a
 * cohort, at a hub, on a programme, with three counts against it. So this form
 * asks for that shape once and records all three figures together.
 *
 * The coordinate is {hub, track, cohort} for a given year, which is what keeps
 * two cohorts numbered "1" apart — Whizzy ran a cohort 1 in 2024 and the 2026
 * extension phase numbered its first cohort 1 as well.
 */

const HUBS = [
  { value: 'accra', label: 'Accra' },
  { value: 'whizzy-academy', label: 'Whizzy' },
  { value: 'plugin', label: 'Plugin' },
];

const PROGRAMMES = [
  { value: 'web-development', label: 'Web Dev' },
  { value: 'digital-marketing', label: 'Digital Marketing' },
];

/**
 * The three counts, in the order Grow reports them. Each is optional: a blank
 * box records nothing rather than a zero, because "we did not count this" and
 * "there were none" are different statements and only one of them is a figure.
 */
const FIGURES = [
  { metric: 'learners_total', label: 'Number of people trained' },
  { metric: 'mothers', label: 'Total number of mothers' },
  { metric: 'graduates', label: 'Total number of graduates' },
];

type Outcome = { label: string; outcome: 'created' | 'updated' | 'unchanged' };

export function RecordGrowCohortDialog({
  open,
  onClose,
  programKey,
}: {
  open: boolean;
  onClose: () => void;
  programKey: string;
}) {
  const createFact = useCreateFact();

  const [hub, setHub] = useState(HUBS[0].value);
  const [track, setTrack] = useState(PROGRAMMES[0].value);
  const [cohort, setCohort] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Outcome[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setHub(HUBS[0].value);
    setTrack(PROGRAMMES[0].value);
    setCohort('');
    setYear(String(new Date().getFullYear()));
    setValues({});
    setSaved(null);
    setFailure(null);
    createFact.reset();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const entered = FIGURES.filter((f) => values[f.metric]?.trim() !== '' && values[f.metric] !== undefined);
  const canSave = Boolean(cohort && year) && entered.length > 0 && !createFact.isPending;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(null);
    setFailure(null);

    const results: Outcome[] = [];

    // Written one at a time rather than in a batch: each figure is its own fact
    // at its own coordinate, and if the third fails the first two are still
    // legitimately recorded and are reported as such.
    for (const figure of entered) {
      try {
        const response = await createFact.mutateAsync({
          program: programKey,
          metric: figure.metric,
          periodType: 'year',
          year: Number(year),
          dimensions: { hub, track, cohort: String(Number(cohort)) },
          value: Number(values[figure.metric]),
        });
        results.push({ label: figure.label, outcome: response.outcome });
      } catch (err) {
        setSaved(results.length ? results : null);
        setFailure(errorMessage(err));
        return;
      }
    }

    setSaved(results);
  }

  const hubLabel = HUBS.find((h) => h.value === hub)?.label ?? hub;
  const trackLabel = PROGRAMMES.find((p) => p.value === track)?.label ?? track;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-on-surface/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grow-cohort-title"
        className="relative w-full max-w-[520px] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-floating"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id="grow-cohort-title" className="text-section-header text-on-surface">
              Record a cohort
            </h2>
            <p className="mt-1 text-secondary-text text-on-surface-variant">
              Grow — one cohort, at one hub, on one programme
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

        <form onSubmit={onSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hub" htmlFor="grow-hub">
                <select id="grow-hub" className={selectClass} value={hub} onChange={(e) => setHub(e.target.value)}>
                  {HUBS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Programme" htmlFor="grow-track">
                <select id="grow-track" className={selectClass} value={track} onChange={(e) => setTrack(e.target.value)}>
                  {PROGRAMMES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Cohort number" htmlFor="grow-cohort">
                <input
                  id="grow-cohort"
                  className={inputClass}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="1"
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                />
              </Field>

              <Field
                label="Year"
                htmlFor="grow-year"
                hint="Two cohorts can share a number across years, so the year is what tells them apart."
              >
                <input
                  id="grow-year"
                  className={inputClass}
                  type="number"
                  min="2000"
                  max="2100"
                  step="1"
                  inputMode="numeric"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </Field>
            </div>

            <div className="space-y-4 border-t border-outline-variant pt-5">
              {FIGURES.map((figure) => (
                <Field key={figure.metric} label={figure.label} htmlFor={`grow-${figure.metric}`}>
                  <input
                    id={`grow-${figure.metric}`}
                    className={inputClass}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="Leave blank if not counted"
                    value={values[figure.metric] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [figure.metric]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>

            {cohort ? (
              <p className="text-secondary-text text-on-surface-variant">
                Recording against{' '}
                <span className="font-medium text-on-surface">
                  {hubLabel} · {trackLabel} · cohort {cohort}
                </span>{' '}
                in {year}.
              </p>
            ) : null}

            {failure ? (
              <p className="text-secondary-text text-status-danger">{failure}</p>
            ) : null}

            {saved ? (
              <ul className="space-y-1 text-secondary-text text-on-surface-variant">
                {saved.map((result) => (
                  <li key={result.label}>
                    <span className="font-medium text-on-surface">{result.label}</span>{' '}
                    {result.outcome === 'unchanged'
                      ? '— already recorded, nothing changed.'
                      : result.outcome === 'updated'
                        ? '— revised. The previous value is kept in history.'
                        : '— recorded.'}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-outline-variant px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              {saved ? 'Done' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {createFact.isPending ? 'Saving…' : `Record ${entered.length || ''} ${entered.length === 1 ? 'figure' : 'figures'}`.trim()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
