import { useId, useState, type ReactNode } from 'react';
import type { Unit } from '../../lib/api';
import { formatValue } from '../../lib/format';
import { Card } from '../ui/Card';

export type TableColumn = { key: string; label: string; unit?: Unit; align?: 'left' | 'right' };
export type TableRow = Record<string, string | number | null>;

/**
 * Wrapper every chart sits in.
 *
 * It owns the two accessibility guarantees the data-viz method requires of a
 * shipped chart: a legend whenever there is more than one series, and a table
 * view of the same numbers. The table is not optional decoration — it is the
 * relief channel for anyone who cannot separate the marks by colour, and it is
 * what makes the figures readable in print.
 */
export function ChartFrame({
  title,
  subtitle,
  series,
  columns,
  rows,
  children,
  footnote,
}: {
  title: string;
  subtitle?: string;
  /** One entry per series. A legend renders only when there are two or more. */
  series?: Array<{ label: string; color: string }>;
  columns: TableColumn[];
  rows: TableRow[];
  children: ReactNode;
  footnote?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-2 pt-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-secondary">{subtitle}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          aria-expanded={showTable}
          aria-controls={tableId}
          className="no-print rounded-lg border border-slate-300 px-2.5 py-1 text-[0.7rem] font-semibold text-ink-secondary transition hover:bg-slate-50"
        >
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {/* A single series needs no legend — the title names it. */}
      {series && series.length > 1 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-2">
          {series.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="px-2 pb-4">
        {showTable ? (
          <DataTable id={tableId} columns={columns} rows={rows} />
        ) : (
          <div className="px-3">{children}</div>
        )}
      </div>

      {footnote ? <p className="border-t border-slate-200 px-5 py-3 text-xs text-ink-muted">{footnote}</p> : null}
    </Card>
  );
}

function DataTable({ id, columns, rows }: { id: string; columns: TableColumn[]; rows: TableRow[] }) {
  return (
    <div id={id} className="max-h-80 overflow-auto px-3">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-surface">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50">
              {columns.map((col) => {
                const raw = row[col.key];
                const isNumber = typeof raw === 'number';
                return (
                  <td
                    key={col.key}
                    className={`border-b border-slate-100 px-3 py-2 text-ink ${
                      col.align === 'right' || isNumber ? 'text-right tabular-nums' : 'text-left'
                    }`}
                  >
                    {isNumber ? formatValue(raw, col.unit) : (raw ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
