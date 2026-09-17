'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {
  inviteAdmin,
  isApiError,
  listAdmins,
  type AdminRole,
  type AdminUser,
  type SessionUser,
} from '@/api';
import type {AdminPermissionCatalogItem, AdminRoleRecord} from '@/api/types';
import {createAdminRole, listAdminRoles} from '@/lib/apis';
import {roleLabel} from '@/lib/helpers';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PermissionPills} from '@/components/admins/role-permission-pills';
import {can} from '@/lib/permissions';

const tableInputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';

const tableSelectClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function isLockedRole(role: AdminRoleRecord) {
  return Boolean(role.isLocked || role.slug === 'super');
}

function formatWhen(value: string | null) {
  if (!value) {
    return 'Never';
  }
  return new Date(value).toLocaleString();
}

export function AdminsScreen({actor}: {actor: SessionUser}) {
  const router = useRouter();
  const canWrite = can(actor, 'admins:write');
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRoleRecord[]>([]);
  const [catalog, setCatalog] = useState<AdminPermissionCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [invite, setInvite] = useState({
    name: '',
    email: '',
    role: '' as AdminRole | '',
    password: '',
    confirmPassword: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [adminRows, rolePayload] = await Promise.all([listAdmins(), listAdminRoles()]);
      setAdmins(adminRows);
      setRoles(rolePayload.roles);
      setCatalog(rolePayload.catalog);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load access management.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onInvite = async () => {
    if (!invite.role) return;
    if (invite.password !== invite.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await inviteAdmin({
        name: invite.name,
        email: invite.email,
        role: invite.role,
        password: invite.password,
      });
      setInvite({
        name: '',
        email: '',
        role: '',
        password: '',
        confirmPassword: '',
      });
      setShowPassword(false);
      await load();
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not add user.');
    } finally {
      setCreating(false);
    }
  };

  const onCreateRole = async () => {
    const slug = slugify(newRoleName);
    if (!slug || slug === 'super') {
      setRoleError('Choose a different role name.');
      return;
    }
    setCreatingRole(true);
    setRoleError(null);
    try {
      const created = await createAdminRole({
        name: newRoleName.trim(),
        slug,
        permissions: ['dashboard:read'],
      });
      setNewRoleName('');
      router.push(`/admins/roles/${created.id}`);
    } catch (err) {
      setRoleError(isApiError(err) ? err.message : 'Could not create role.');
      setCreatingRole(false);
    }
  };

  const canSubmitInvite =
    invite.name.trim().length > 0 &&
    invite.email.trim().length > 0 &&
    invite.password.length >= 8 &&
    invite.confirmPassword.length >= 8 &&
    invite.password === invite.confirmPassword &&
    Boolean(invite.role);

  if (loading && admins.length === 0 && roles.length === 0) {
    return <LoadingState label="Loading access management..." />;
  }

  if (error && admins.length === 0 && roles.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Access Management"
        description="Invite operators and assign roles with permissions."
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}

      {formError ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{formError}</p>
      ) : null}

      {roleError ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{roleError}</p>
      ) : null}

      {!canWrite ? (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          View only - changes require access management write permission.
        </p>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Users</h2>
      <div className="mb-8">
        {admins.length === 0 && !canWrite ? (
          <EmptyState title="No users" body="Add the first operator below." />
        ) : (
          <DataTable
            tableClassName="table-fixed"
            columnWidths={['16%', '20%', '14%', '14%', '16%', '20%']}
            columnHeaderClassNames={[
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              'text-right',
            ]}
            columns={['Name', 'Email', 'Role', 'Status', 'Last login', 'Actions']}>
            {admins.map(admin => (
              <tr key={admin.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{admin.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{admin.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={admin.role === 'super' ? 'primary' : 'muted'}>
                    {roles.find(role => role.slug === admin.role)?.name ?? roleLabel(admin.role)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={admin.active ? 'primary' : 'danger'}>
                    {admin.active ? 'Active' : 'Disabled'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatWhen(admin.lastLogin)}</td>
                <td className="px-4 py-3 text-end">
                  <Link href={`/admins/${admin.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
            {canWrite ? (
              <tr className="border-t-2 border-border bg-primary-soft/40">
                <td className="px-4 py-2">
                  <input
                    className={tableInputClass}
                    value={invite.name}
                    onChange={e => setInvite(s => ({...s, name: e.target.value}))}
                    placeholder="Name"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    className={tableInputClass}
                    type="email"
                    value={invite.email}
                    onChange={e => setInvite(s => ({...s, email: e.target.value}))}
                    placeholder="Email"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    className={tableSelectClass}
                    value={invite.role}
                    onChange={e => setInvite(s => ({...s, role: e.target.value}))}>
                    <option value="">Role</option>
                    {roles.map(role => (
                      <option key={role.slug} value={role.slug}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="relative">
                    <input
                      className={`${tableInputClass} pr-9`}
                      type={showPassword ? 'text' : 'password'}
                      minLength={8}
                      value={invite.password}
                      onChange={e => setInvite(s => ({...s, password: e.target.value}))}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(open => !open)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="relative">
                    <input
                      className={`${tableInputClass} pr-9`}
                      type={showPassword ? 'text' : 'password'}
                      minLength={8}
                      value={invite.confirmPassword}
                      onChange={e => setInvite(s => ({...s, confirmPassword: e.target.value}))}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(open => !open)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <Button
                    size="sm"
                    disabled={creating || !canSubmitInvite}
                    onClick={() => void onInvite()}>
                    {creating ? 'Adding...' : 'Add'}
                  </Button>
                </td>
              </tr>
            ) : null}
          </DataTable>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Roles & Permissions</h2>
      <div className="mb-8">
        {roles.length === 0 && !canWrite ? (
          <EmptyState title="No roles" body="Create the first role below." />
        ) : (
          <DataTable
            tableClassName="table-fixed"
            columnWidths={canWrite ? ['32%', '48%', '20%'] : ['36%', '48%', '16%']}
            columnHeaderClassNames={[undefined, undefined, 'text-right']}
            columns={['Role', 'Permissions', 'Actions']}>
            {roles.map(role => {
              const locked = isLockedRole(role);
              return (
                <tr key={role.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{role.name}</td>
                  <td className="px-4 py-3">
                    <PermissionPills
                      permissions={role.permissions}
                      catalog={catalog}
                      allPermissions={locked}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admins/roles/${role.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
            {canWrite ? (
              <tr className="border-t-2 border-border bg-primary-soft/40">
                <td className="px-4 py-2">
                  <input
                    className={tableInputClass}
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="New role name"
                  />
                </td>
                <td className="px-4 py-2">
                  <PermissionPills permissions={['dashboard:read']} catalog={catalog} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Button
                    size="sm"
                    disabled={creatingRole || !newRoleName.trim()}
                    onClick={() => void onCreateRole()}>
                    {creatingRole ? 'Adding...' : 'Add'}
                  </Button>
                </td>
              </tr>
            ) : null}
          </DataTable>
        )}
      </div>
    </>
  );
}
