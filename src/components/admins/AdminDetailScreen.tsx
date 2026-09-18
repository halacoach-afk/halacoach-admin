'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import {getAdmin, isApiError, updateAdmin, type SessionUser} from '@/api';
import type {AdminRoleRecord, AdminUserDetail} from '@/api/types';
import {listAdminRoles} from '@/lib/apis';
import {cn} from '@/lib/cn';
import {roleLabel} from '@/lib/helpers';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PermissionAccessMatrix} from '@/components/admins/PermissionAccessMatrix';
import {can} from '@/lib/permissions';

const tableInputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';

const tableSelectClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary';

function formatWhen(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

export function AdminDetailScreen({actor, id}: {actor: SessionUser; id: string}) {
  const canWrite = can(actor, 'admins:write');
  const [admin, setAdmin] = useState<AdminUserDetail | null>(null);
  const [roles, setRoles] = useState<AdminRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDisable, setPendingDisable] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, rolePayload] = await Promise.all([getAdmin(id), listAdminRoles()]);
      setAdmin(detail);
      setRoles(rolePayload.roles);
      setName(detail.name);
      setRole(detail.role);
      setEditing(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load user.');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const cancelEdit = () => {
    if (!admin) return;
    setName(admin.name);
    setRole(admin.role);
    setEditing(false);
    setSaveError(null);
  };

  const saveProfile = async () => {
    if (!admin) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateAdmin(admin.id, {
        name: name.trim(),
        role,
        actorId: actor.id,
      });
      setAdmin(updated);
      setName(updated.name);
      setRole(updated.role);
      setEditing(false);
    } catch (err) {
      setSaveError(isApiError(err) ? err.message : 'Could not save user.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!admin) return;
    setSaveError(null);
    try {
      const updated = await updateAdmin(admin.id, {
        active: !admin.active,
        actorId: actor.id,
      });
      setAdmin(updated);
      setPendingDisable(false);
    } catch (err) {
      setSaveError(isApiError(err) ? err.message : 'Could not update account.');
      setPendingDisable(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading user..." />;
  }

  if (error || !admin) {
    return <ErrorState body={error ?? 'User not found.'} onRetry={() => void load()} />;
  }

  const roleName = roles.find(item => item.slug === admin.role)?.name ?? roleLabel(admin.role);

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admins"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to access management
        </Link>
      </div>

      <PageHeader
        title="Access Management"
        description="Invite operators and assign roles with permissions."
      />

      {!canWrite ? (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          View only - editing users requires access management write permission.
        </p>
      ) : null}

      {saveError ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{saveError}</p>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Details</h2>
      <div className="mb-8">
        <DataTable
          tableClassName="table-fixed"
          columnWidths={
            canWrite
              ? ['18%', '24%', '14%', '12%', '14%', '18%']
              : ['20%', '28%', '16%', '14%', '22%']
          }
          columnHeaderClassNames={
            canWrite
              ? [undefined, undefined, undefined, undefined, undefined, 'text-right']
              : undefined
          }
          columns={
            canWrite
              ? ['Name', 'Email', 'Role', 'Status', 'Last login', 'Actions']
              : ['Name', 'Email', 'Role', 'Status', 'Last login']
          }>
          <tr
            className={cn(
              'border-b border-border last:border-0',
              editing && 'bg-primary-soft/30',
            )}>
            <td className="px-4 py-2">
              {editing ? (
                <input
                  className={tableInputClass}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              ) : (
                <span className="font-medium text-foreground">{admin.name}</span>
              )}
            </td>
            <td className="px-4 py-2 text-sm text-muted-foreground">{admin.email}</td>
            <td className="px-4 py-2">
              {editing ? (
                <select
                  className={tableSelectClass}
                  value={role}
                  onChange={e => setRole(e.target.value)}>
                  {roles.map(item => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge tone={admin.role === 'super' ? 'primary' : 'muted'}>{roleName}</Badge>
              )}
            </td>
            <td className="px-4 py-2">
              <Badge tone={admin.active ? 'primary' : 'danger'}>
                {admin.active ? 'Active' : 'Disabled'}
              </Badge>
            </td>
            <td className="px-4 py-2 text-sm text-foreground">{formatWhen(admin.lastLogin)}</td>
            {canWrite ? (
              <td className="px-4 py-2">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {editing ? (
                    <>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        Close
                      </Button>
                      <Button
                        size="sm"
                        disabled={saving || !name.trim() || !role}
                        onClick={() => void saveProfile()}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={admin.id === actor.id}
                        onClick={() =>
                          admin.active ? setPendingDisable(true) : void toggleActive()
                        }>
                        {admin.active ? 'Disable' : 'Enable'}
                      </Button>
                    </>
                  )}
                </div>
              </td>
            ) : null}
          </tr>
        </DataTable>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Permissions</h2>
      <div className="mb-8">
        <PermissionAccessMatrix
          catalog={admin.catalog ?? []}
          permissions={admin.effectivePermissions ?? []}
          allGranted={admin.role === 'super'}
        />
      </div>

      <ConfirmDialog
        open={pendingDisable}
        title="Disable this user?"
        body={`${admin.name} will not be able to sign in until you enable the account again.`}
        confirmLabel="Disable"
        destructive
        onClose={() => setPendingDisable(false)}
        onConfirm={() => void toggleActive()}
      />
    </>
  );
}
