export function roleLabel(role: string) {
  switch (role) {
    case 'super':
      return 'Super admin';
    case 'reviewer':
      return 'Reviewer';
    case 'support':
      return 'Support';
    default:
      return role;
  }
}

/** Display names for permission modules (match nav labels). */
const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  verification: 'Verification',
  professionals: 'Professionals',
  clients: 'Clients',
  leads: 'Leads',
  credits: 'Credits',
  services: 'Services',
  support: 'Support',
  messages: 'Messages',
  admins: 'Access Management',
};

export function moduleLabel(module: string) {
  return MODULE_LABELS[module] ?? module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** @deprecated Prefer roleLabel(role) for custom roles. */
export const roleLabels: Record<string, string> = {
  super: 'Super admin',
  reviewer: 'Reviewer',
  support: 'Support',
};
