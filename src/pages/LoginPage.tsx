import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
import { Field, inputClass } from '../components/ui/Field';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-7">
          <img src="/mest-logo.png" alt="MEST" width={300} height={49} className="h-6 w-auto" />
          <p className="mt-2 text-secondary-text text-on-surface-muted">Research &amp; Impact</p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-7">
          <h1 className="text-section-header text-on-surface">Sign in</h1>
          <p className="mt-1.5 text-secondary-text text-on-surface-variant">
            Impact reporting across every MEST programme.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-status-danger/30 bg-status-danger-container px-3 py-2 text-secondary-text text-status-on-danger-container"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="primary" disabled={submitting} className="mt-1 w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-secondary-text text-on-surface-muted">
          Every figure in this system is calculated from recorded data.
        </p>
      </div>
    </div>
  );
}
