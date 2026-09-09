import type {AdminRole} from '@/api/types';

export type Permission =
  | 'dashboard:read'
  | 'verification:read'
  | 'verification:write'
  | 'professionals:read'
  | 'professionals:write'
  | 'clients:read'
  | 'clients:write'
  | 'leads:read'
  | 'leads:write'
  | 'requests:read'
  | 'requests:write'
  | 'credits:read'
  | 'credits:write'
  | 'credits:adjust'
  | 'services:read'
  | 'services:write'
  | 'support:read'
  | 'support:write'
  | 'messages:read'
  | 'settings:read'
  | 'settings:write'
  | 'admins:read'
  | 'admins:write';

const ALL: Permission[] = [
  'dashboard:read',
  'verification:read',
  'verification:write',
  'professionals:read',
  'professionals:write',
  'clients:read',
  'clients:write',
  'leads:read',
  'leads:write',
  'requests:read',
  'requests:write',
  'credits:read',
  'credits:write',
  'credits:adjust',
  'services:read',
  'services:write',
  'support:read',
  'support:write',
  'messages:read',
  'settings:read',
  'settings:write',
  'admins:read',
  'admins:write',
];

const byRole: Record<AdminRole, Permission[]> = {
  super: ALL,
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

export function can(role: AdminRole, permission: Permission) {
  return byRole[role].includes(permission);
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
    leads: 'leads:read',
    requests: 'requests:read',
    credits: 'credits:read',
    services: 'services:read',
    support: 'support:read',
    messages: 'messages:read',
    settings: 'settings:read',
    admins: 'admins:read',
  };
  return map[segment ?? ''] ?? 'dashboard:read';
}
