import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { OverviewPage } from './pages/OverviewPage';
import { ProgramPage } from './pages/ProgramPage';
import { ComparePage } from './pages/ComparePage';
import { DataQualityPage } from './pages/DataQualityPage';
import { SheetsPage } from './pages/SheetsPage';
import { AdminPage } from './pages/AdminPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { useAuth } from './lib/auth';

/**
 * Real routes, so pages have URLs that can be bookmarked, shared, and reached
 * with the browser's back button.
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<OverviewPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/p/:pageKey" element={<ProgramPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/imports" element={<SheetsPage />} />
        <Route path="/quality" element={<DataQualityPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
