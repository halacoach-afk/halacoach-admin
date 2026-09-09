'use client';

import {FormEvent, useEffect, useState} from 'react';
import {
  inviteAdmin,
  isApiError,
  listAdmins,
  updateAdmin,
  type AdminRole,
  type AdminUser,
  type SessionUser,
} from '@/api';
import {roleLabels} from '@/lib/helpers';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {Input} from '@/components/ui/Input';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {can} from '@/lib/permissions';

const roles: AdminRole[] = ['super', 'reviewer', 'support'];

function formatWhen(value: string | null) {
  if (!value) {
    return 'Never';
  }
  return new Date(value).toLocaleString();
}

export function AdminsScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor.role, 'admins:write');
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [pendingDisable, setPendingDisable] = useState<AdminUser | null>(null);
  const [invite, setInvite] = useState({
    name: '',
    email: '',
    role: 'reviewer' as AdminRole,
    password: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAdmins(await listAdmins());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load admins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onInvite = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      await inviteAdmin(invite);
      setInvite({name: '', email: '', role: 'reviewer', password: ''});
      setShowInvite(false);
      await load();
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not invite admin.');
    }
  };

  const changeRole = async (admin: AdminUser, role: AdminRole) => {
    setError(null);
    try {
      await updateAdmin(admin.id, {role, actorId: actor.id});
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update role.');
    }
  };

  const toggleActive = async (admin: AdminUser) => {
    setError(null);
    try {
      await updateAdmin(admin.id, {active: !admin.active, actorId: actor.id});
      setPendingDisable(null);
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update account.');
      setPendingDisable(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Admins"
        actions={
          canWrite ? (
            <Button onClick={() => setShowInvite(open => !open)}>
              {showInvite ? 'Close' : 'Invite admin'}
            </Button>
          ) : null
        }
      />

      {showInvite && canWrite ? (
        <Card className="mb-6">
          <p className="mb-4 font-semibold text-foreground">Invite admin</p>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onInvite}>
            <Input
              label="Name"
              name="name"
              value={invite.name}
              onChange={e => setInvite(s => ({...s, name: e.target.value}))}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={invite.email}
              onChange={e => setInvite(s => ({...s, email: e.target.value}))}
              required
            />
            <label className="block text-sm font-medium text-foreground">
              Role
              <select
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={invite.role}
                onChange={e => setInvite(s => ({...s, role: e.target.value as AdminRole}))}>
                {roles.map(role => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Temporary password"
              name="password"
              type="password"
              minLength={8}
              value={invite.password}
              onChange={e => setInvite(s => ({...s, password: e.target.value}))}
              required
            />
            {formError ? (
              <p className="sm:col-span-2 text-sm text-destructive">{formError}</p>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit">Send invite</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? <LoadingState label="Loading admins…" /> : null}
      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}
      {!loading && !error && admins.length === 0 ? (
        <EmptyState title="No admins" body="Invite the first operator." />
      ) : null}

      {!loading && !error && admins.length > 0 ? (
        <DataTable columns={['Name', 'Email', 'Role', 'Status', 'Last login', '']}>
          {admins.map(admin => (
            <tr key={admin.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{admin.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{admin.email}</td>
              <td className="px-4 py-3">
                {canWrite ? (
                  <select
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                    value={admin.role}
                    onChange={e => void changeRole(admin, e.target.value as AdminRole)}>
                    {roles.map(role => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge tone={admin.role === 'super' ? 'primary' : 'muted'}>
                    {roleLabels[admin.role]}
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={admin.active ? 'primary' : 'danger'}>
                  {admin.active ? 'Active' : 'Disabled'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatWhen(admin.lastLogin)}</td>
              <td className="px-4 py-3 text-end">
                {canWrite ? (
                  <Button
                    variant={admin.active ? 'outline' : 'primary'}
                    size="sm"
                    disabled={admin.id === actor.id}
                    onClick={() =>
                      admin.active ? setPendingDisable(admin) : void toggleActive(admin)
                    }>
                    {admin.active ? 'Disable' : 'Enable'}
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}

      <ConfirmDialog
        open={pendingDisable !== null}
        title="Disable this admin?"
        body={`${pendingDisable?.name ?? ''} will not be able to sign in until you enable the account again.`}
        confirmLabel="Disable"
        destructive
        onClose={() => setPendingDisable(null)}
        onConfirm={() => pendingDisable && void toggleActive(pendingDisable)}
      />
    </>
  );
}
