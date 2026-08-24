import { useMemo, useState } from 'react';
import {
  useCreateUser,
  useMetrics,
  usePrograms,
  useUpdateUser,
  useUsers,
  useResendInvite,
  useRevokeUser,
  useDeleteUser,
  flattenPrograms,
} from '../hooks/useData';
import { errorMessage, type Invite, type ProgramNode, type Role, type User } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/layout/DashboardLayout';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, inputClass, selectClass } from '../components/ui/Field';
import { CloseIcon } from '../components/ui/Icons';

const ROLES: Array<{ value: Role; label: string; description: string }> = [
  { value: 'viewer', label: 'Viewer', description: 'Reads dashboards and exports. Records nothing.' },
  { value: 'editor', label: 'Editor', description: 'Records figures, within the scope set below.' },
  { value: 'approver', label: 'Approver', description: 'Records anywhere, connects sheets, sets thresholds.' },
  { value: 'admin', label: 'Admin', description: 'Everything, plus users, roles and the audit log.' },
];

export function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Administration" subtitle="Users, roles, and what each person may change" />
      <UsersTab />
    </div>
  );
}

/* ------------------------------------------------------------------- users */

function UsersTab() {
  const users = useUsers();
  const { user: me } = useAuth();
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [reissued, setReissued] = useState<{ user: User; invite: Invite } | null>(null);
  const resend = useResendInvite();

  if (users.isLoading) return <Skeleton className="h-64" />;
  if (users.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(users.error)} onRetry={() => void users.refetch()} />
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setCreating(true)}>
          Invite a user
        </Button>
      </div>

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-body-text">
          <thead>
            <tr>
              {['User', 'Role', 'Scope', 'Last active', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="border-b border-outline-variant px-card-padding pb-3 pt-card-padding text-left text-label-caps uppercase text-on-surface-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((user) => (
              <tr key={user.id} className={user.status === 'disabled' ? 'opacity-60' : undefined}>
                <td className="border-b border-outline-variant px-card-padding py-3">
                  <div className="font-medium text-on-surface">
                    {user.fullName}
                    {user.id === me?.id ? <span className="ml-2 text-xs text-on-surface-muted">you</span> : null}
                  </div>
                  <div className="text-secondary-text text-on-surface-muted">{user.email}</div>
                </td>
                <td className="border-b border-outline-variant px-card-padding py-3">
                  <span className="rounded border border-outline-variant px-2 py-0.5 text-secondary-text capitalize text-on-surface-variant">
                    {user.role}
                  </span>
                </td>
                <td className="border-b border-outline-variant px-card-padding py-3">
                  <ScopeSummary user={user} />
                </td>
                <td className="border-b border-outline-variant px-card-padding py-3 text-secondary-text text-on-surface-variant">
                  {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                </td>
                <td className="border-b border-outline-variant px-card-padding py-3">
                  <StatusPill status={user.status ?? 'active'} />
                </td>
                <td className="border-b border-outline-variant px-card-padding py-3">
                  <div className="flex justify-end gap-2">
                    {user.status === 'invited' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={resend.isPending}
                        onClick={async () => {
                          const result = await resend.mutateAsync(user.id);
                          setReissued({ user, invite: result.invite });
                        }}
                      >
                        New link
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => setEditing(user)}>
                      Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editing ? <UserDialog user={editing} onClose={() => setEditing(null)} /> : null}
      {creating ? <UserDialog onClose={() => setCreating(false)} /> : null}
      {reissued ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setReissued(null)}
            className="fixed inset-0 bg-on-surface/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[560px] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-floating"
          >
            <InviteHandoff
              invite={reissued.invite}
              name={reissued.user.fullName}
              onClose={() => setReissued(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function StatusPill({ status }: { status: 'active' | 'invited' | 'disabled' }) {
  const tone =
    status === 'active'
      ? { dot: 'bg-status-success', label: 'Active' }
      : status === 'invited'
        ? { dot: 'bg-status-warning', label: 'Invited' }
        : { dot: 'bg-on-surface-muted', label: 'Disabled' };

  return (
    <span className="flex items-center gap-2 text-secondary-text text-on-surface-variant">
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      {tone.label}
    </span>
  );
}

/**
 * An editor with no scopes is unrestricted, which is what keeps existing
 * accounts working — so it has to read as a deliberate state, not as blank.
 */
function ScopeSummary({ user }: { user: User }) {
  const { data: programs = [] } = usePrograms();
  const byId = useMemo(() => {
    const flat = flattenPrograms<ProgramNode>(programs);
    return new Map(flat.map((p) => [p.id, p.name]));
  }, [programs]);

  if (user.role === 'admin' || user.role === 'approver') {
    return <span className="text-secondary-text text-on-surface-muted">Everything</span>;
  }
  if (user.role === 'viewer') {
    return <span className="text-secondary-text text-on-surface-muted">Read only</span>;
  }

  const { programs: scoped = [], metrics = [] } = user.scopes ?? {};
  if (scoped.length === 0 && metrics.length === 0) {
    return <span className="text-secondary-text text-on-surface-muted">All programmes</span>;
  }

  const names = scoped.map((id) => byId.get(id) ?? 'Unknown');
  return (
    <div className="flex flex-wrap gap-1">
      {names.slice(0, 2).map((name) => (
        <span key={name} className="rounded bg-primary-container px-1.5 py-0.5 text-xs text-on-primary-container">
          {name}
        </span>
      ))}
      {names.length > 2 ? (
        <span className="rounded bg-surface-variant px-1.5 py-0.5 text-xs text-on-surface-variant">
          +{names.length - 2}
        </span>
      ) : null}
      {metrics.length > 0 ? (
        <span className="rounded bg-surface-variant px-1.5 py-0.5 text-xs text-on-surface-variant">
          {metrics.length} metric{metrics.length === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
}

function UserDialog({ user, onClose }: { user?: User; onClose: () => void }) {
  const isNew = !user;
  const create = useCreateUser();
  const update = useUpdateUser();
  const { data: programs = [] } = usePrograms();
  const { data: metrics = [] } = useMetrics();

  const reportable = useMemo(
    () => flattenPrograms<ProgramNode>(programs).filter((p) => p.isReportable),
    [programs]
  );

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'viewer');
  const [scopedPrograms, setScopedPrograms] = useState<string[]>(user?.scopes?.programs ?? []);
  const [scopedMetrics, setScopedMetrics] = useState<string[]>(user?.scopes?.metrics ?? []);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  async function save() {
    setError(null);
    try {
      const scopes = { programs: scopedPrograms, metrics: scopedMetrics };
      if (isNew) {
        const result = await create.mutateAsync({ firstName, lastName, email, role, scopes });
        // Held on screen rather than closed: the link is shown once and cannot
        // be recovered afterwards, only re-issued.
        if (result.invite) {
          setInvite(result.invite);
          return;
        }
      } else {
        await update.mutateAsync({
          id: user!.id,
          role,
          scopes,
          ...(password ? { password } : {}),
        });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const busy = create.isPending || update.isPending;
  const canSave = isNew ? Boolean(firstName && lastName && email) : true;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-on-surface/40" />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[620px] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-floating"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 pb-4 pt-5">
          <div>
            <h2 className="text-section-header text-on-surface">{isNew ? 'Invite a user' : user!.fullName}</h2>
            <p className="mt-1 text-secondary-text text-on-surface-variant">
              {isNew ? 'They choose their own password from the link you send them.' : user!.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md p-1.5 text-on-surface-muted transition hover:bg-surface-variant"
          >
            <CloseIcon />
          </button>
        </div>

        {invite ? (
          <InviteHandoff invite={invite} name={`${firstName} ${lastName}`.trim()} onClose={onClose} />
        ) : (
        <div className="flex flex-col gap-5 px-6 py-5">
          {isNew ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" htmlFor="firstName">
                  <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Last name" htmlFor="lastName">
                  <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label="Email" htmlFor="email">
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </Field>
            </>
          ) : null}

          {isNew ? (
            <p className="rounded-md bg-surface px-3 py-2.5 text-secondary-text text-on-surface-variant">
              They will get a link to set their own password. Nobody else ever sees it.
            </p>
          ) : (
            <Field label="Reset password (optional)" htmlFor="password" hint="At least 10 characters.">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}

          <Field
            label="Role"
            htmlFor="role"
            hint={ROLES.find((r) => r.value === role)?.description}
          >
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={selectClass}>
              {ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {role === 'editor' ? (
            <fieldset className="rounded-md border border-outline-variant p-4">
              <legend className="px-1.5 text-label-caps uppercase text-on-surface-muted">Scope</legend>
              <p className="mb-3 text-xs leading-snug text-on-surface-muted">
                Leave both empty and they may record anything. Tick programmes or metrics to limit them to those.
              </p>

              <p className="text-secondary-text font-medium text-on-surface">Programmes</p>
              <div className="mt-2 grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {reportable.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-secondary-text text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={scopedPrograms.includes(p.id)}
                      onChange={() => setScopedPrograms((list) => toggle(list, p.id))}
                      className="accent-primary"
                    />
                    {p.name}
                  </label>
                ))}
              </div>

              <p className="mt-4 text-secondary-text font-medium text-on-surface">Metrics</p>
              <div className="mt-2 grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {metrics.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-secondary-text text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={scopedMetrics.includes(m.key)}
                      onChange={() => setScopedMetrics((list) => toggle(list, m.key))}
                      className="accent-primary"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {!isNew ? <DangerZone user={user!} onDone={onClose} /> : null}

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-status-danger/30 bg-status-danger-container px-3 py-2 text-secondary-text text-status-on-danger-container"
            >
              {error}
            </p>
          ) : null}

          <div className="-mx-6 -mb-5 flex justify-end gap-3 border-t border-outline-variant px-6 py-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canSave || busy} onClick={save}>
              {busy ? 'Saving…' : isNew ? 'Create invitation' : 'Save changes'}
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

/**
 * The link is shown once. It is stored only as a hash, so it cannot be read
 * back later — losing it means re-issuing, which is why copying is the primary
 * action here.
 */
function InviteHandoff({ invite, name, onClose }: { invite: Invite; name: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <div>
        <h3 className="text-body-text font-medium text-on-surface">Invitation ready for {name}</h3>
        <p className="mt-1 text-secondary-text text-on-surface-variant">
          Send them this link. It works once, and expires{' '}
          {new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={invite.url}
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClass} font-mono text-xs`}
        />
        <Button
          variant="primary"
          onClick={() => {
            void navigator.clipboard?.writeText(invite.url);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <p className="rounded-md bg-surface px-3 py-2.5 text-secondary-text text-on-surface-variant">
        This is the only time the link is shown — it is stored as a hash, not as text. If it goes astray, issue
        a new one from the users list.
      </p>

      <div className="-mx-6 -mb-6 flex justify-end border-t border-outline-variant px-6 py-4">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

/**
 * Revoking is the reversible one: the person keeps their place in the record
 * and can be let back in. Deleting is not — the facts they recorded survive,
 * because they are append-only and belong to the programme, but the link back
 * to who entered them is gone.
 */
function DangerZone({ user, onDone }: { user: User; onDone: () => void }) {
  const revoke = useRevokeUser();
  const remove = useDeleteUser();
  const update = useUpdateUser();
  const { user: me } = useAuth();

  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isSelf = user.id === me?.id;
  const revoked = user.status === 'disabled';
  const authored = user.footprint?.facts ?? 0;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (isSelf) {
    return (
      <p className="rounded-md bg-surface px-3 py-2.5 text-secondary-text text-on-surface-variant">
        This is your own account. Another admin has to revoke or delete it.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-outline-variant">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
        <div className="min-w-0">
          <p className="text-body-text font-medium text-on-surface">
            {revoked ? 'Access is revoked' : 'Revoke access'}
          </p>
          <p className="mt-0.5 text-secondary-text text-on-surface-variant">
            {revoked
              ? 'They cannot sign in. Restoring lets them back in with the same password.'
              : 'Ends every session and cancels any unaccepted invitation. Reversible.'}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={revoke.isPending || update.isPending}
          onClick={() =>
            run(() =>
              revoked ? update.mutateAsync({ id: user.id, isActive: true }) : revoke.mutateAsync(user.id)
            )
          }
        >
          {revoked ? 'Restore access' : 'Revoke access'}
        </Button>
      </div>

      <div className="px-4 py-3">
        {confirming ? (
          <>
            <p className="text-body-text font-medium text-on-surface">Delete {user.fullName}?</p>
            <p className="mt-1 text-secondary-text text-on-surface-variant">
              {authored > 0
                ? `The ${authored.toLocaleString('en-GB')} figures they recorded keep their values — nothing is destroyed — but they will no longer show who entered them. The audit log keeps their name.`
                : 'They have not recorded any figures. The audit log will keep their name.'}
            </p>

            <label htmlFor="confirm-delete" className="mt-3 block text-secondary-text text-on-surface-variant">
              Type <span className="font-mono font-medium text-on-surface">{user.email}</span> to confirm.
            </label>
            <input
              id="confirm-delete"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className={`${inputClass} mt-1.5`}
            />

            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => { setConfirming(false); setTyped(''); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={typed !== user.email || remove.isPending}
                onClick={() => run(() => remove.mutateAsync(user.id))}
              >
                {remove.isPending ? 'Deleting…' : 'Delete permanently'}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-text font-medium text-on-surface">Delete account</p>
              <p className="mt-0.5 text-secondary-text text-on-surface-variant">
                Permanent. {authored > 0 ? `${authored.toLocaleString('en-GB')} figures lose their author.` : 'They have recorded nothing.'}
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-secondary-text text-status-on-danger-container">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
