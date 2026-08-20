import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { api, errorMessage, tokens, type Role } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Field, inputClass } from '../components/ui/Field';
import { Button } from '../components/ui/Button';

const ROLE_BLURB: Record<Role, string> = {
  viewer: 'You will be able to read every dashboard and export figures.',
  editor: 'You will be able to record figures for the programmes assigned to you.',
  approver: 'You will be able to record figures anywhere and publish what others propose.',
  admin: 'You will have full access, including user management.',
};

type Invite = { firstName: string; lastName: string; email: string; role: Role };

/**
 * Where an invite link lands. Public — the person has no account to sign in
 * with yet, which is the whole point.
 */
export function AcceptInvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const { user, refresh } = useAuth();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getInvite(token)
      .then((data) => !cancelled && setInvite(data))
      .catch((err) => !cancelled && setLoadError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (accepted || (user && !invite)) return <Navigate to="/" replace />;

  const tooShort = password.length > 0 && password.length < 10;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 10 && confirm === password && !submitting;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.acceptInvite(token, password);
      tokens.set(result.accessToken, result.refreshToken);
      await refresh();
      setAccepted(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-on-primary">
            M
          </span>
          <div className="leading-tight">
            <p className="text-[17px] font-bold text-on-surface">MEST Impact</p>
            <p className="text-secondary-text text-on-surface-muted">Research &amp; Impact</p>
          </div>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-7">
          {loadError ? (
            <>
              <h1 className="text-section-header text-on-surface">This link is no longer valid</h1>
              <p className="mt-2 text-body-text text-on-surface-variant">{loadError}</p>
            </>
          ) : !invite ? (
            <p className="text-body-text text-on-surface-muted">Checking your invitation…</p>
          ) : (
            <>
              <h1 className="text-section-header text-on-surface">Welcome, {invite.firstName}</h1>
              <p className="mt-2 text-body-text text-on-surface-variant">
                You have been invited to join as{' '}
                <span className="font-medium capitalize text-on-surface">{invite.role}</span>.{' '}
                {ROLE_BLURB[invite.role]}
              </p>
              <p className="mt-3 rounded-md bg-surface px-3 py-2 text-secondary-text text-on-surface-variant">
                Signing in as <span className="font-medium text-on-surface">{invite.email}</span>
              </p>

              <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
                <Field
                  label="Choose a password"
                  htmlFor="password"
                  hint={tooShort ? <span className="text-status-danger">At least 10 characters.</span> : 'At least 10 characters.'}
                >
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Confirm it"
                  htmlFor="confirm"
                  hint={mismatch ? <span className="text-status-danger">These do not match.</span> : undefined}
                >
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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

                <Button type="submit" variant="primary" disabled={!canSubmit} className="mt-1 w-full">
                  {submitting ? 'Setting up…' : 'Set password and sign in'}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-secondary-text text-on-surface-muted">
          Nobody else can see the password you choose — not even an administrator.
        </p>
      </div>
    </div>
  );
}
