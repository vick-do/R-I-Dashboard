import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage, type ProgramNode, type SheetDryRun, type SheetInspection } from '../../lib/api';
import { usePrograms, useConnectSheet, flattenPrograms } from '../../hooks/useData';
import { Field, inputClass, selectClass } from '../ui/Field';
import { Button } from '../ui/Button';
import { CloseIcon, WarningIcon } from '../ui/Icons';

type Step = 0 | 1 | 2;
const STEP_TITLES = ['Which spreadsheet?', 'Which tab, and for which programme?', 'What it will read'];

/**
 * Extracts the id from a pasted Google Sheets URL, because people copy the
 * address bar rather than the 44-character id buried inside it.
 */
function extractId(input: string): string {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(input.trim());
  return match ? match[1] : input.trim();
}

/**
 * Connects a Google Sheet tab to a programme, ending in a dry run so nothing is
 * connected on trust.
 */
export function ConnectSheetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: programs = [] } = usePrograms();
  const connect = useConnectSheet();

  const [step, setStep] = useState<Step>(0);
  const [raw, setRaw] = useState('');
  const [inspection, setInspection] = useState<SheetInspection | null>(null);
  const [tabName, setTabName] = useState('');
  const [programKey, setProgramKey] = useState('');
  const [dry, setDry] = useState<SheetDryRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const spreadsheetId = extractId(raw);
  const reportable = useMemo(
    () => flattenPrograms<ProgramNode>(programs).filter((p) => p.isReportable),
    [programs]
  );
  const mapping = inspection?.suggestion?.suggestion ?? {};

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setRaw('');
    setInspection(null);
    setTabName('');
    setProgramKey('');
    setDry(null);
    setError(null);
    setDone(false);
    connect.reset();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function findSheet() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.inspectSheet({ spreadsheetId });
      setInspection(result);
      setStep(1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function inspectAndPreview() {
    setBusy(true);
    setError(null);
    try {
      const withTab = await api.inspectSheet({ spreadsheetId, tabName });
      setInspection((prev) => (prev ? { ...prev, suggestion: withTab.suggestion } : withTab));
      const result = await api.dryRunSheet({
        spreadsheetId,
        tabName,
        program: programKey,
        mapping: withTab.suggestion?.suggestion ?? {},
      });
      setDry(result);
      setStep(2);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError(null);
    try {
      await connect.mutateAsync({ spreadsheetId, tabName, program: programKey, mapping });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-on-surface/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-sheet-title"
        className="relative w-full max-w-[680px] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-floating"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id="connect-sheet-title" className="text-section-header text-on-surface">
              Connect a Google Sheet
            </h2>
            <p className="mt-1 text-secondary-text text-on-surface-variant">
              {done ? 'Connected' : `Step ${step + 1} of 3 — ${STEP_TITLES[step]}`}
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

        {done ? (
          <div className="px-6 py-8">
            <p className="text-body-text text-on-surface">
              <span className="font-medium">{inspection?.title}</span> › {tabName} is now connected to{' '}
              <span className="font-medium">{reportable.find((p) => p.pageKey === programKey)?.name}</span>.
            </p>
            <p className="mt-2 text-secondary-text text-on-surface-variant">
              It will sync on the next scheduled run, or use Sync now to pull it immediately.
            </p>
            <div className="-mx-6 -mb-8 mt-6 flex justify-end border-t border-outline-variant px-6 py-4">
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-6 py-5">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-surface-variant'}`} />
              ))}
            </div>

            {step === 0 ? (
              <Field
                label="Paste the spreadsheet link"
                htmlFor="sheet-url"
                hint="The whole address is fine — the id is picked out of it. The sheet must be shared with the platform's service account first."
              >
                <input
                  id="sheet-url"
                  autoFocus
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  className={inputClass}
                />
              </Field>
            ) : null}

            {step === 1 && inspection ? (
              <>
                <p className="text-body-text text-on-surface">
                  Found <span className="font-medium">{inspection.title}</span> — {inspection.tabs.length} tab
                  {inspection.tabs.length === 1 ? '' : 's'}.
                </p>

                <Field label="Which tab holds the figures?" htmlFor="tab">
                  <select id="tab" value={tabName} onChange={(e) => setTabName(e.target.value)} className={selectClass}>
                    <option value="">Choose…</option>
                    {inspection.tabs.map((tab) => (
                      <option key={tab.name} value={tab.name}>
                        {tab.name} ({tab.rowCount} rows)
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Which programme does it report on?" htmlFor="sheet-program">
                  <select
                    id="sheet-program"
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

            {step === 2 && dry ? <DryRunReview dry={dry} inspection={inspection} /> : null}

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-status-danger/30 bg-status-danger-container px-3 py-2 text-secondary-text text-status-on-danger-container"
              >
                {error}
              </p>
            ) : null}

            <div className="-mx-6 -mb-5 flex items-center justify-between gap-3 border-t border-outline-variant px-6 py-4">
              <Button variant="ghost" onClick={step === 0 ? onClose : () => setStep((s) => (s - 1) as Step)}>
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>

              {step === 0 ? (
                <Button variant="primary" disabled={!spreadsheetId || busy} onClick={findSheet}>
                  {busy ? 'Looking…' : 'Find sheet'}
                </Button>
              ) : step === 1 ? (
                <Button variant="primary" disabled={!tabName || !programKey || busy} onClick={inspectAndPreview}>
                  {busy ? 'Reading…' : 'Preview what it reads'}
                </Button>
              ) : (
                <Button variant="primary" disabled={connect.isPending} onClick={save}>
                  {connect.isPending ? 'Connecting…' : 'Connect this sheet'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DryRunReview({ dry, inspection }: { dry: SheetDryRun; inspection: SheetInspection | null }) {
  const confidence = inspection?.suggestion?.suggestion.confidence;
  const failedChecks = dry.checks.filter((c) => c.status === 'fail');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Tally label="New figures" value={dry.summary.created} />
        <Tally label="Revised" value={dry.summary.updated} />
        <Tally label="Unchanged" value={dry.summary.unchanged} />
      </div>

      {dry.summary.created + dry.summary.updated === 0 ? (
        <p className="rounded-md border border-status-warning/40 bg-status-warning-container px-3 py-2 text-secondary-text text-status-on-warning-container">
          This mapping reads nothing from the tab. {confidence === 'low' ? 'The layout was not recognised — ' : ''}
          it will need mapping by hand before it is useful.
        </p>
      ) : null}

      <div
        className={`flex items-start gap-2.5 rounded-md px-3 py-2.5 ${
          dry.wouldAutoCommit
            ? 'bg-status-success-container text-status-on-success-container'
            : 'bg-status-warning-container text-status-on-warning-container'
        }`}
      >
        {dry.wouldAutoCommit ? (
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="min-w-0 text-secondary-text">
          {dry.wouldAutoCommit ? (
            <span>Reconciles cleanly — syncs will commit on their own.</span>
          ) : (
            <>
              <span className="font-medium">Syncs will be held for review.</span>
              <ul className="mt-1 list-disc pl-4">
                {dry.heldBecause.slice(0, 3).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {failedChecks.length > 0 ? (
        <div>
          <p className="text-label-caps uppercase text-on-surface-muted">Reconciliation</p>
          <ul className="mt-2 flex flex-col gap-1">
            {failedChecks.map((check) => (
              <li key={check.label} className="text-secondary-text text-on-surface-variant">
                {check.label} — states {check.expected}, rows sum to {check.actual}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dry.sample.length > 0 ? (
        <div>
          <p className="text-label-caps uppercase text-on-surface-muted">First figures it would write</p>
          <div className="mt-2 max-h-52 overflow-auto rounded-md border border-outline-variant">
            <table className="w-full border-collapse text-secondary-text">
              <tbody>
                {dry.sample.map((row) => (
                  <tr key={row.sourceRef}>
                    <td className="border-b border-outline-variant px-3 py-1.5 text-on-surface">{row.metric}</td>
                    <td className="border-b border-outline-variant px-3 py-1.5 text-on-surface-muted">
                      {Object.values(row.dimensions ?? {}).join(', ') || row.period}
                    </td>
                    <td className="tnum border-b border-outline-variant px-3 py-1.5 text-right font-medium text-on-surface">
                      {row.value.toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-outline-variant p-3">
      <p className="text-label-caps uppercase text-on-surface-muted">{label}</p>
      <p className="mt-1 text-[22px] font-semibold text-on-surface">{value}</p>
    </div>
  );
}
