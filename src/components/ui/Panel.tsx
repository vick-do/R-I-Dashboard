import { useId, useState, type ReactNode } from 'react';
import { Card } from './Card';
import { TableIcon } from './Icons';

export type PanelTable = {
  columns: Array<{ key: string; label: string; align?: 'left' | 'right' }>;
  rows: Array<Record<string, string>>;
};

/**
 * The frame every chart sits in.
 */
export function Panel({
  title,
  subtitle,
  action,
  table,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  table?: PanelTable;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    // `data-panel` is the hook the print stylesheet uses to keep a chart and
    // its title from being split across two pages.
    <Card data-panel className={`flex flex-col p-card-padding ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-card-title text-on-surface">{title}</h2>
          {subtitle ? <p className="mt-1 text-secondary-text text-on-surface-variant">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-3">
          {action}
          {table ? (
            <button
              type="button"
              onClick={() => setShowTable((prev) => !prev)}
              aria-expanded={showTable}
              aria-controls={tableId}
              className="no-print flex shrink-0 items-center gap-1.5 rounded-md border border-outline-variant px-2.5 py-1 text-secondary-text font-medium text-on-surface-variant transition hover:bg-surface-variant"
            >
              {showTable ? 'Chart' : 'Table'}
              <TableIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {showTable && table ? <DataTable id={tableId} table={table} /> : children}
    </Card>
  );
}

function DataTable({ id, table }: { id: string; table: PanelTable }) {
  return (
    <div id={id} className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-body-text">
        <thead>
          <tr>
            {table.columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`border-b border-outline-variant px-2 pb-2 text-label-caps uppercase text-on-surface-muted ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index}>
              {table.columns.map((col) => (
                <td
                  key={col.key}
                  className={`border-b border-outline-variant px-2 py-2.5 text-on-surface ${
                    col.align === 'right' ? 'tnum text-right' : 'text-left'
                  }`}
                >
                  {row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
