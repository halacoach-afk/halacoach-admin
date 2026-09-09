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
  Shield,
  Users,
  UserRoundCog,
} from 'lucide-react';
import type {Permission} from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  module: string;
  permission: Permission;
};

export const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    description: 'Counts and recent activity across matching, verification, and credits.',
    icon: LayoutDashboard,
    module: 'M13',
    permission: 'dashboard:read',
  },
  {
    href: '/verification',
    label: 'Verification',
    description: 'Review coach documents. Profiles go live only after approval.',
    icon: BadgeCheck,
    module: 'M5',
    permission: 'verification:read',
  },
  {
    href: '/professionals',
    label: 'Professionals',
    description: 'Coach profiles, services, location, wallet, and activation.',
    icon: Shield,
    module: 'M4',
    permission: 'professionals:read',
  },
  {
    href: '/clients',
    label: 'Clients',
    description: 'Matching preferences, consents, OTP, and saved coaches.',
    icon: Users,
    module: 'M6',
    permission: 'clients:read',
  },
  {
    href: '/online-clients',
    label: 'Online plans',
    description: 'Coach-built training plans from the mobile Clients tab.',
    icon: ClipboardList,
    module: 'M6b',
    permission: 'clients:read',
  },
  {
    href: '/leads',
    label: 'Leads',
    description: 'Client requests in the marketplace, unlocks, and credit cost.',
    icon: MapPin,
    module: 'M7',
    permission: 'leads:read',
  },
  {
    href: '/credits',
    label: 'Credits',
    description: 'Packs, promo codes, VAT, transactions, and wallet adjustments.',
    icon: Coins,
    module: 'M9',
    permission: 'credits:read',
  },
  {
    href: '/services',
    label: 'Services',
    description: 'Catalog of coaching services used in professional onboarding.',
    icon: LifeBuoy,
    module: 'M3',
    permission: 'services:read',
  },
  {
    href: '/support',
    label: 'Support',
    description: 'Contact-us inbox from the mobile app.',
    icon: Headset,
    module: 'M11',
    permission: 'support:read',
  },
  {
    href: '/messages',
    label: 'Messages',
    description: 'Read-only view of client ↔ coach chat threads (demo data).',
    icon: MessageCircle,
    module: 'M12',
    permission: 'messages:read',
  },
  {
    href: '/admins',
    label: 'Admins',
    description: 'Invite operators and assign super / reviewer / support roles.',
    icon: UserRoundCog,
    module: 'M1',
    permission: 'admins:read',
  },
];
