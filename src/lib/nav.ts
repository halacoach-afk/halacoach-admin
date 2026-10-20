import type {LucideIcon} from 'lucide-react';
import {
  BadgeCheck,
  ClipboardList,
  Coins,
  Crown,
  Headset,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Receipt,
  Settings,
  Shield,
  Tag,
  UserCog,
  Users,
} from 'lucide-react';
import type {Permission} from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: Permission;
  /** Sidebar action badge key from GET /v1/nav-badges. */
  badgeKey?: 'pendingVerifications' | 'openSupportTickets';
};

export const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    description: 'Counts and recent activity across matching, verification, and credits.',
    icon: LayoutDashboard,
    permission: 'dashboard:read',
  },
  {
    href: '/verification',
    label: 'Documents Verification',
    description: 'Review coach documents. Profiles go live only after approval.',
    icon: BadgeCheck,
    permission: 'verification:read',
    badgeKey: 'pendingVerifications',
  },
  {
    href: '/professionals',
    label: 'Professionals',
    description: 'Coach profiles, services, location, wallet, and activation.',
    icon: Shield,
    permission: 'professionals:read',
  },
  {
    href: '/clients',
    label: 'Clients',
    description: 'Matching preferences, consents, and OTP.',
    icon: Users,
    permission: 'clients:read',
  },
  {
    href: '/leads',
    label: 'Leads',
    description: 'Client requests in the marketplace, unlocks, and credit cost.',
    icon: MapPin,
    permission: 'leads:read',
  },
  {
    href: '/online-clients',
    label: 'Online plans',
    description: 'Coach-built training plans from the mobile Clients tab.',
    icon: ClipboardList,
    permission: 'clients:read',
  },
  {
    href: '/billing',
    label: 'Billing & Invoices',
    description: 'Membership subscriptions and credit ledger activity.',
    icon: Receipt,
    permission: 'credits:read',
  },
  {
    href: '/founding-members',
    label: 'Founding Members',
    description:
      'Coaches with founding badge from membership or Trial Pack, including canceled.',
    icon: Crown,
    permission: 'credits:read',
  },
  {
    href: '/credits',
    label: 'Credit Plans',
    description: 'Packs, promo codes, VAT, and catalog configuration.',
    icon: Coins,
    permission: 'credits:read',
  },
  {
    href: '/lead-pricing',
    label: 'Lead Pricings',
    description: 'Unlock cost modes: percentage-based or criteria-based pricing.',
    icon: Tag,
    permission: 'credits:read',
  },
  {
    href: '/services',
    label: 'Services',
    description: 'Catalog of coaching services used in professional onboarding.',
    icon: LifeBuoy,
    permission: 'services:read',
  },
  {
    href: '/support',
    label: 'Support',
    description: 'Contact-us inbox from the mobile app.',
    icon: Headset,
    permission: 'support:read',
    badgeKey: 'openSupportTickets',
  },
  {
    href: '/admins',
    label: 'Access Management',
    description: 'Invite operators and assign roles with permissions.',
    icon: UserCog,
    permission: 'admins:read',
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Platform contact details and shared configuration.',
    icon: Settings,
    permission: 'settings:read',
  },
];
