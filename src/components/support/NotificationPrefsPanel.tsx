import {
  Bell,
  Mail,
  MessageCircle,
  MessageSquare,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type {NotificationPrefs} from '@/api/types';
import {Badge} from '@/components/ui/Badge';
import {notificationPrefLabels} from '@/lib/notification-utils';

const PREF_ICONS: Record<keyof NotificationPrefs, LucideIcon> = {
  push: Bell,
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  marketing: Sparkles,
};

export function NotificationPrefsPanel({prefs}: {prefs: NotificationPrefs}) {
  return (
    <ul className="divide-y divide-border">
      {notificationPrefLabels.map(item => {
        const Icon = PREF_ICONS[item.key];
        const enabled = Boolean(prefs[item.key]);
        return (
          <li
            key={item.key}
            className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0 sm:items-center sm:gap-3 sm:py-3.5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-primary sm:mt-0 sm:size-9">
              <Icon className="size-4 sm:size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm">
                {item.hint}
              </p>
            </div>
            <Badge tone={enabled ? 'primary' : 'muted'} className="shrink-0">
              {enabled ? 'On' : 'Off'}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
