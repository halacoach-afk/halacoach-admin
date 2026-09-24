import type {LucideIcon} from 'lucide-react';
import {
  BadgeCheck,
  ClipboardList,
  Coins,
  Headset,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  MessageCircle,
  Repeat,
  Settings,
  Shield,
  Users,
  LockKeyhole,
} from 'lucide-react';
import type {Permission} from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: Permission;
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
    label: 'Verification',
    description: 'Review coach documents. Profiles go live only after approval.',
    icon: BadgeCheck,
    permission: 'verification:read',
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
    href: '/messages',
    label: 'Messages',
    description: 'Read-only view of client <-> coach chat threads (demo data).',
    icon: MessageCircle,
    permission: 'messages:read',
  },
  {
    href: '/subscriptions',
    label: 'Subscriptions',
    description: 'Membership plans, period usage, wallet balance, and renewals.',
    icon: Repeat,
    permission: 'credits:read',
  },
  {
    href: '/credits',
    label: 'Credits',
    description: 'Packs, promo codes, VAT, transactions, and wallet adjustments.',
    icon: Coins,
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
  },
  {
    href: '/admins',
    label: 'Access Management',
    description: 'Invite operators and assign roles with permissions.',
    icon: LockKeyhole,
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
