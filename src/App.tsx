import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { OverviewPage } from './pages/OverviewPage';
import { ProgramPage } from './pages/ProgramPage';
import { EdTechMondaysPage, EDTECH_PAGE_KEY } from './pages/EdTechMondaysPage';
import { EdTechFellowshipPage, FELLOWSHIP_PAGE_KEY } from './pages/EdTechFellowshipPage';
import { PortfolioPage, PORTFOLIO_PAGE_KEY } from './pages/PortfolioPage';
import { ComparePage } from './pages/ComparePage';
import { DataQualityPage } from './pages/DataQualityPage';
import { SheetsPage } from './pages/SheetsPage';
import { AdminPage } from './pages/AdminPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { useAuth } from './lib/auth';

/**
 * Real routes, so pages have URLs that can be bookmarked, shared, and reached
 * with the browser's back button.
 *
 * The reporting pages are public. Anyone can open the dashboard and read what
 * MEST has done — the figures, the breakdowns, the whole tree — without an
 * account, and the edit controls simply are not there for them. Operations
 * pages, which are about the people and the machinery rather than the impact,
 * still need signing in for.
 */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-body-text text-on-surface-muted">
        <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-outline border-t-primary" />
        Loading
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

/**
 * One programme reports something the shared template does not fit.
 *
 * EdTech Mondays is a broadcasting season — ten measures of one audience,
 * counted by channel and again by platform — and reads as a monthly report.
 * The EdTech Fellowship reports every audience several ways over and carries
 * targets it was funded against, which the shared template has no place for.
 * The Portfolio counts companies rather than people, and most of its tab is
 * three rosters of names. Year pages stay on the shared template, which is
 * what they are: one year of the same thing.
 */
const BESPOKE: Record<string, () => JSX.Element> = {
  [EDTECH_PAGE_KEY]: EdTechMondaysPage,
  [FELLOWSHIP_PAGE_KEY]: EdTechFellowshipPage,
  [PORTFOLIO_PAGE_KEY]: PortfolioPage,
};

function ProgramRoute() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const Bespoke = pageKey ? BESPOKE[pageKey] : undefined;
  return Bespoke ? <Bespoke /> : <ProgramPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route element={<DashboardLayout />}>
        {/* Public: the impact record. */}
        <Route path="/" element={<OverviewPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/p/:pageKey" element={<ProgramRoute />} />

        {/* Staff only: people, provenance and the import machinery. */}
        <Route path="/approvals" element={<RequireAuth><ApprovalsPage /></RequireAuth>} />
        <Route path="/imports" element={<RequireAuth><SheetsPage /></RequireAuth>} />
        <Route path="/quality" element={<RequireAuth><DataQualityPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
