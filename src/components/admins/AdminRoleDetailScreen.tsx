'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import {isApiError, type SessionUser} from '@/api';
import type {
  AdminPermission,
  AdminPermissionCatalogItem,
  AdminRoleRecord,
} from '@/api/types';
import {deleteAdminRole, listAdminRoles, updateAdminRole} from '@/lib/apis';
import {cn} from '@/lib/cn';
import {Button} from '@/components/ui/Button';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PermissionPills} from '@/components/admins/role-permission-pills';
import {moduleLabel} from '@/lib/helpers';
import {can} from '@/lib/permissions';

const tableInputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';

/** Matrix columns - map catalog actions onto these labels. */
const ACCESS_COLUMNS = [
  {label: 'Read', actions: ['read']},
  {label: 'Write', actions: ['write']},
  {label: 'Update', actions: ['update', 'adjust']},
  {label: 'Delete', actions: ['delete']},
] as const;

function isLockedRole(role: AdminRoleRecord) {
  return Boolean(role.isLocked || role.slug === 'super');
}

function AccessToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer',
      )}>
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export function AdminRoleDetailScreen({actor, id}: {actor: SessionUser; id: string}) {
  const router = useRouter();
  const canWrite = can(actor, 'admins:write');
  const roleId = Number(id);

  const [role, setRole] = useState<AdminRoleRecord | null>(null);
  const [catalog, setCatalog] = useState<AdminPermissionCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  const locked = role ? isLockedRole(role) : false;
  const canEdit = canWrite && !locked;

  const load = async () => {
    if (!Number.isFinite(roleId)) {
      setError('Role not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await listAdminRoles();
      setCatalog(payload.catalog);
      const match = payload.roles.find(item => item.id === roleId) ?? null;
      if (!match) {
        setRole(null);
        setError('Role not found.');
        return;
      }
      setRole(match);
      setName(match.name);
      setPermissions([...match.permissions]);
      setEditing(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load role.');
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const moduleRows = useMemo(() => {
    const modules = new Map<string, Map<string, AdminPermission>>();
    for (const item of catalog) {
      const actions = modules.get(item.module) ?? new Map<string, AdminPermission>();
      actions.set(item.action, item.key);
      modules.set(item.module, actions);
    }
    return [...modules.entries()]
      .map(([module, actions]) => ({
        module,
        label: moduleLabel(module),
        actions,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'en', {sensitivity: 'base'}));
  }, [catalog]);

  const resolvePermissionKey = (
    actions: Map<string, AdminPermission>,
    candidates: readonly string[],
  ): AdminPermission | null => {
    for (const action of candidates) {
      const key = actions.get(action);
      if (key) return key;
    }
    return null;
  };

  const cancelEdit = () => {
    if (!role) return;
    setName(role.name);
    setPermissions([...role.permissions]);
    setEditing(false);
    setSaveError(null);
  };

  const togglePermission = (key: AdminPermission) => {
    if (!editing || !canEdit) return;
    setPermissions(current =>
      current.includes(key) ? current.filter(item => item !== key) : [...current, key],
    );
  };

  const saveRole = async () => {
    if (!role || !canEdit) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateAdminRole(role.id, {
        name: name.trim(),
        permissions,
      });
      setRole(updated);
      setName(updated.name);
      setPermissions([...updated.permissions]);
      setEditing(false);
    } catch (err) {
      setSaveError(isApiError(err) ? err.message : 'Could not save role.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!role || locked) return;
    try {
      await deleteAdminRole(role.id);
      router.push('/admins');
    } catch (err) {
      setPendingDelete(false);
      setSaveError(isApiError(err) ? err.message : 'Could not delete role.');
    }
  };

  if (loading && !role) {
    return <LoadingState label="Loading role..." />;
  }

  if (error && !role) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  if (!role) {
    return <ErrorState body="Role not found." />;
  }

  const granted = (key: AdminPermission) => locked || permissions.includes(key);

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

      {locked ? (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          This role is locked. Permissions are fixed to all capabilities.
        </p>
      ) : null}

      {!canWrite ? (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          View only - editing roles requires access management write permission.
        </p>
      ) : null}

      {saveError ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{saveError}</p>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Details</h2>
      <div className="mb-8">
        <DataTable
          tableClassName="table-fixed"
          columnWidths={canEdit ? ['34%', '46%', '20%'] : ['40%', '60%']}
          columnHeaderClassNames={
            canEdit ? [undefined, undefined, 'text-right'] : undefined
          }
          columns={canEdit ? ['Name', 'Permissions', 'Actions'] : ['Name', 'Permissions']}>
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
                <span className="font-medium text-foreground">{role.name}</span>
              )}
            </td>
            <td className="px-4 py-2">
              <PermissionPills
                permissions={permissions}
                catalog={catalog}
                allPermissions={locked}
              />
            </td>
            {canEdit ? (
              <td className="px-4 py-2">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {editing ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={saving}>
                        Close
                      </Button>
                      <Button
                        size="sm"
                        disabled={saving || !name.trim() || permissions.length === 0}
                        onClick={() => void saveRole()}>
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
                        onClick={() => setPendingDelete(true)}>
                        Delete
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
        <DataTable
          tableClassName="table-fixed"
          columnWidths={['28%', '18%', '18%', '18%', '18%']}
          columns={['Module', ...ACCESS_COLUMNS.map(column => column.label)]}>
          {moduleRows.map(row => (
            <tr
              key={row.module}
              className={cn(
                'border-b border-border last:border-0',
                editing && 'bg-primary-soft/30',
              )}>
              <td className="px-4 py-3 text-sm font-medium text-foreground">{row.label}</td>
              {ACCESS_COLUMNS.map(column => {
                const key = resolvePermissionKey(row.actions, column.actions);
                return (
                  <td key={column.label} className="px-4 py-3">
                    {key ? (
                      <AccessToggle
                        checked={granted(key)}
                        disabled={!editing}
                        onChange={() => togglePermission(key)}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </DataTable>
      </div>

      <ConfirmDialog
        open={pendingDelete}
        title="Delete this role?"
        body={`${role.name} will be removed. Reassign any users on this role first.`}
        confirmLabel="Delete"
        destructive
        onClose={() => setPendingDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </>
  );
}
