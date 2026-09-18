import type {AdminPermission, AdminPermissionCatalogItem} from '@/api/types';
import {Badge} from '@/components/ui/Badge';

type PermissionPill = {label: string; tone: 'primary' | 'sky' | 'muted'};

/** Show "update" for both update and adjust actions. */
export function actionLabel(action: string) {
  return action === 'adjust' ? 'update' : action;
}

function normalizeAction(action: string) {
  return action === 'adjust' ? 'update' : action;
}

export function permissionPills(
  permissions: AdminPermission[],
  catalog: AdminPermissionCatalogItem[],
  options?: {allPermissions?: boolean},
): PermissionPill[] {
  if (
    options?.allPermissions ||
    (catalog.length > 0 && catalog.every(item => permissions.includes(item.key)))
  ) {
    return [{label: 'All', tone: 'primary'}];
  }

  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  const actionOrder: string[] = [];

  for (const item of catalog) {
    const action = normalizeAction(item.action);
    if (!totals.has(action)) {
      totals.set(action, 0);
      counts.set(action, 0);
      actionOrder.push(action);
    }
    totals.set(action, (totals.get(action) ?? 0) + 1);
  }

  for (const key of permissions) {
    const raw = key.includes(':') ? key.split(':')[1]! : key;
    const action = normalizeAction(raw);
    if (!counts.has(action)) {
      counts.set(action, 0);
      if (!actionOrder.includes(action)) {
        actionOrder.push(action);
      }
    }
    counts.set(action, (counts.get(action) ?? 0) + 1);
  }

  if (actionOrder.length === 0) {
    return [{label: String(permissions.length), tone: 'muted'}];
  }

  return actionOrder.map(action => {
    const count = counts.get(action) ?? 0;
    const total = totals.get(action) ?? 0;
    const isAll = total > 0 && count >= total;
    const value = isAll ? 'all' : String(count);
    return {
      label: `${actionLabel(action)}: ${value}`,
      tone: isAll ? 'sky' : 'muted',
    };
  });
}

export function PermissionPills({
  permissions,
  catalog,
  allPermissions,
}: {
  permissions: AdminPermission[];
  catalog: AdminPermissionCatalogItem[];
  allPermissions?: boolean;
}) {
  const pills = permissionPills(permissions, catalog, {allPermissions});
  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map(pill => (
        <Badge key={pill.label} tone={pill.tone}>
          {pill.label}
        </Badge>
      ))}
    </div>
  );
}
