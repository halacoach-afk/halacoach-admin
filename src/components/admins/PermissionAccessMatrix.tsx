'use client';

import {useMemo} from 'react';
import type {AdminPermission, AdminPermissionCatalogItem} from '@/api/types';
import {cn} from '@/lib/cn';
import {DataTable} from '@/components/ui/DataTable';
import {moduleLabel} from '@/lib/helpers';

const ACCESS_COLUMNS = [
  {label: 'Read', actions: ['read']},
  {label: 'Write', actions: ['write']},
  {label: 'Update', actions: ['update', 'adjust']},
  {label: 'Delete', actions: ['delete']},
] as const;

function AccessToggle({checked, disabled}: {checked: boolean; disabled?: boolean}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
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

function resolvePermissionKey(
  actions: Map<string, AdminPermission>,
  candidates: readonly string[],
): AdminPermission | null {
  for (const action of candidates) {
    const key = actions.get(action);
    if (key) return key;
  }
  return null;
}

export function PermissionAccessMatrix({
  catalog,
  permissions,
  allGranted,
}: {
  catalog: AdminPermissionCatalogItem[];
  permissions: AdminPermission[];
  allGranted?: boolean;
}) {
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

  const granted = (key: AdminPermission) =>
    allGranted || permissions.includes(key);

  return (
    <DataTable
      tableClassName="table-fixed"
      columnWidths={['28%', '18%', '18%', '18%', '18%']}
      columns={['Module', ...ACCESS_COLUMNS.map(column => column.label)]}>
      {moduleRows.map(row => (
        <tr key={row.module} className="border-b border-border last:border-0">
          <td className="px-4 py-3 text-sm font-medium text-foreground">{row.label}</td>
          {ACCESS_COLUMNS.map(column => {
            const key = resolvePermissionKey(row.actions, column.actions);
            return (
              <td key={column.label} className="px-4 py-3">
                {key ? (
                  <AccessToggle checked={granted(key)} disabled />
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </DataTable>
  );
}
