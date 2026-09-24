import type {AdminPermission, AdminRole, SessionUser} from '@/api/types';

export type Permission = AdminPermission;

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard:read',
  'verification:read',
  'verification:write',
  'professionals:read',
  'professionals:write',
  'clients:read',
  'clients:write',
  'leads:read',
  'leads:write',
  'credits:read',
  'credits:write',
  'credits:adjust',
  'services:read',
  'services:write',
  'support:read',
  'support:write',
  'settings:read',
  'settings:write',
  'messages:read',
  'admins:read',
  'admins:write',
];

const DEFAULT_BY_ROLE: Record<string, Permission[]> = {
  super: [...ALL_PERMISSIONS],
  reviewer: [
    'dashboard:read',
    'verification:read',
    'verification:write',
    'professionals:read',
  ],
  support: [
    'dashboard:read',
    'clients:read',
    'clients:write',
    'support:read',
    'support:write',
    'messages:read',
    'credits:read',
    'credits:adjust',
  ],
};

function permissionsOf(actor: SessionUser | AdminRole): Permission[] {
  if (typeof actor === 'string') {
    return DEFAULT_BY_ROLE[actor] ?? [];
  }
  if (actor.permissions && actor.permissions.length > 0) {
    return actor.permissions;
  }
  return DEFAULT_BY_ROLE[actor.role] ?? [];
}

export function can(actor: SessionUser | AdminRole, permission: Permission) {
  return permissionsOf(actor).includes(permission);
}

export function permissionForPath(pathname: string): Permission {
  if (pathname === '/') {
    return 'dashboard:read';
  }
  const segment = pathname.split('/').filter(Boolean)[0];
  const map: Record<string, Permission> = {
    verification: 'verification:read',
    professionals: 'professionals:read',
    clients: 'clients:read',
    'online-clients': 'clients:read',
    leads: 'leads:read',
    credits: 'credits:read',
    subscriptions: 'credits:read',
    services: 'services:read',
    support: 'support:read',
    settings: 'settings:read',
    messages: 'messages:read',
    admins: 'admins:read',
  };
  return map[segment ?? ''] ?? 'dashboard:read';
}
