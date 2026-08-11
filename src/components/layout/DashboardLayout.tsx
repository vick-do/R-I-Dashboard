import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { usePrograms } from '../../hooks/useData';
import { useAuth } from '../../lib/auth';
import { Sidebar } from './Sidebar';

/**
 * The application shell.
 *
 * Previously this lived inside OverviewPage, which made the overview and the
 * chrome the same component. They are separated here so every route shares one
 * layout and the overview is just another page.
 */
export function DashboardLayout() {
  const { data: programs = [], isLoading } = usePrograms();
  const { user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-sunken text-ink">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
          {/* The previous sidebar was `hidden md:flex` with no fallback, leaving
              phones with no navigation at all. This is that fallback. */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-ink-secondary transition hover:bg-slate-100 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              M
            </span>
            <div className="leading-tight">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">MEST Africa</p>
              <p className="text-sm font-semibold text-ink">Research &amp; Impact</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold text-ink">{user.fullName}</p>
                  <p className="text-[0.68rem] capitalize text-ink-muted">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-slate-50"
                >
                  Sign out
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 sm:px-6">
        <aside className="no-print hidden w-64 shrink-0 self-start rounded-xl border border-slate-200 bg-surface shadow-card lg:block">
          <div className="max-h-[calc(100vh-7rem)] overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-ink-muted">Loading programmes…</p>
            ) : (
              <Sidebar programs={programs} />
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {drawerOpen ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-ink">Programmes</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-1.5 text-ink-muted transition hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Sidebar programs={programs} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
