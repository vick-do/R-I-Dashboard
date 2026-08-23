import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePrograms, useProgramSummary, useScorecard, flattenPrograms } from '../../hooks/useData';
import { useAuth } from '../../lib/auth';
import { PeriodProvider, usePeriod } from '../../lib/period';
import { Sidebar } from './Sidebar';
import { PeriodSelector } from '../ui/PeriodSelector';
import { BellIcon, ChevronRightIcon, CloseIcon, ExportIcon, MenuIcon, SignOutIcon } from '../ui/Icons';

/**
 * The application shell: a fixed sidebar, a top bar carrying the breadcrumb and the global
 * period filter, and a scrolling content column.
 */
export function DashboardLayout() {
  const { data: programs = [], isLoading } = usePrograms();
  const { user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <PeriodProvider>
      <div className="min-h-screen bg-surface text-on-surface">
        <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-outline-variant bg-surface-container-lowest lg:flex">
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? <NavSkeleton /> : <Sidebar programs={programs} />}
          </div>
          {user ? <UserRow name={user.fullName} role={user.role} onSignOut={() => void signOut()} /> : null}
        </aside>

        {drawerOpen ? (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-on-surface/40"
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface-container-lowest shadow-floating">
              <Brand onClose={() => setDrawerOpen(false)} />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Sidebar programs={programs} onNavigate={() => setDrawerOpen(false)} />
              </div>
              {user ? <UserRow name={user.fullName} role={user.role} onSignOut={() => void signOut()} /> : null}
            </div>
          </div>
        ) : null}

        <div className="lg:pl-64">
          <TopBar programs={programs} onOpenDrawer={() => setDrawerOpen(true)} />
          <main className="mx-auto max-w-[1440px] p-page-padding">
            <Outlet />
          </main>
        </div>
      </div>
    </PeriodProvider>
  );
}

function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary">
        M
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[17px] font-bold text-on-surface">MEST Impact</p>
        <p className="truncate text-xs text-on-surface-muted">Research &amp; Impact</p>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="ml-auto rounded-md p-1.5 text-on-surface-muted transition hover:bg-surface-variant"
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}

function UserRow({ name, role, onSignOut }: { name: string; role: string; onSignOut: () => void }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 border-t border-outline-variant px-4 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
        {initials}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-body-text font-medium text-on-surface">{name}</p>
        <p className="truncate text-xs capitalize text-on-surface-muted">{role}</p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="ml-auto shrink-0 rounded-md p-1.5 text-on-surface-muted transition hover:bg-surface-variant hover:text-on-surface"
      >
        <SignOutIcon />
      </button>
    </div>
  );
}

function TopBar({
  programs,
  onOpenDrawer,
}: {
  programs: NonNullable<ReturnType<typeof usePrograms>['data']>;
  onOpenDrawer: () => void;
}) {
  const location = useLocation();
  const { year, setYear } = usePeriod();
  const trail = useBreadcrumb(programs ?? [], location.pathname);

  /**
   * Which years the filter should offer depends on what is on screen.
   *
   * A programme that only ever recorded all-time figures — Web3, Pre-Mest,
   * MEST Scale — gains nothing from a year filter, and picking one just empties
   * the page. So a programme page offers its own years and nothing else, the
   * reporting pages offer the organisation's, and the operations screens have
   * no period at all.
   */
  const programmeKey = location.pathname.startsWith('/p/') ? location.pathname.slice(3) : undefined;
  const isReporting = location.pathname === '/' || location.pathname === '/compare';

  // Same cache keys the pages themselves use, so neither costs an extra request.
  const scorecard = useScorecard(undefined);
  const summary = useProgramSummary(programmeKey, year);

  const years = programmeKey
    ? (summary.data?.availableYears ?? [])
    : isReporting
      ? (scorecard.data?.years ?? [])
      : [];

  // Only judge a selection once the page's own year list has actually arrived —
  // an empty list mid-fetch is not the same as a page with no years.
  const yearsLoaded = programmeKey ? summary.isSuccess : isReporting ? scorecard.isSuccess : true;

  /**
   * Drop a year the page cannot show.
   *
   * The period is deliberately global — it survives navigation so a reader can
   * hold 2025 still while moving between programmes. But carrying it onto a
   * programme that has no 2025, or none at all, produced an empty page reading
   * "No data recorded for 2024" with no clue that a filter was the cause.
   */
  useEffect(() => {
    if (!yearsLoaded) return;
    if (year !== undefined && !years.includes(year)) setYear(undefined);
  }, [year, yearsLoaded, years.join(','), setYear]);

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-outline-variant bg-surface-container-lowest px-page-padding">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="-ml-2 rounded-md p-2 text-on-surface-variant transition hover:bg-surface-variant lg:hidden"
      >
        <MenuIcon />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-secondary-text text-on-surface-muted">
        {trail.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-2">
            {index > 0 ? <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" /> : null}
            <span className={index === trail.length - 1 ? 'truncate font-medium text-on-surface' : 'hidden truncate sm:inline'}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <PeriodSelector years={years} value={year} onChange={setYear} />
        <button
          type="button"
          disabled
          title="Exports arrive with the next phase"
          className="hidden items-center gap-2 rounded-md border border-outline-variant px-3 py-1.5 text-secondary-text font-medium text-on-surface-muted sm:flex"
        >
          <ExportIcon />
          Export
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-full p-1.5 text-on-surface-variant transition hover:bg-surface-variant"
        >
          <BellIcon />
        </button>
      </div>
    </header>
  );
}

function useBreadcrumb(
  programs: NonNullable<ReturnType<typeof usePrograms>['data']>,
  pathname: string
): string[] {
  const staticTrails: Record<string, string[]> = {
    '/': ['Dashboard', 'Overview'],
    '/compare': ['Dashboard', 'Compare programmes'],
    '/approvals': ['Operations', 'Approvals'],
    '/imports': ['Operations', 'Connected sheets'],
    '/quality': ['Operations', 'Data quality'],
    '/admin': ['Operations', 'Administration'],
  };
  if (staticTrails[pathname]) return staticTrails[pathname];
  if (!pathname.startsWith('/p/')) return ['Dashboard'];

  const pageKey = pathname.slice(3);
  const flat = flattenPrograms(programs);
  const node = flat.find((p) => p.pageKey === pageKey);
  if (!node) return ['Programmes'];

  const trail: string[] = [node.name];
  let current = node;
  while (current.parent) {
    const parent = flat.find((p) => p.id === current.parent);
    if (!parent) break;
    trail.unshift(parent.name);
    current = parent;
  }
  return trail;
}

function NavSkeleton() {
  return (
    <div className="space-y-2 p-3" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded bg-surface-variant" />
      ))}
    </div>
  );
}

/** Page header: title, subtitle, and the page's own primary action. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-page-title text-on-surface">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-secondary-text text-on-surface-variant">{subtitle}</p> : null}
      </div>
      {actions ? <div className="no-print flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
