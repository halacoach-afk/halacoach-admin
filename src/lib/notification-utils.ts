import type {NotificationPrefs} from '@/api/types';

export const defaultNotificationPrefs: NotificationPrefs = {
  push: true,
  email: true,
  sms: true,
  matchUpdates: true,
  messages: true,
  marketing: true,
};

export const notificationPrefLabels: {key: keyof NotificationPrefs; label: string; hint: string}[] = [
  {key: 'push', label: 'Push notifications', hint: 'Alerts on the device'},
  {key: 'email', label: 'Email notifications', hint: 'Updates by email'},
  {key: 'sms', label: 'SMS notifications', hint: 'Text messages for urgent items'},
  {key: 'matchUpdates', label: 'Match updates', hint: 'New coaches, leads, and match activity'},
  {key: 'messages', label: 'Messages', hint: 'Coach and client replies'},
  {key: 'marketing', label: 'Product updates', hint: 'Tips, offers, and new features'},
];

export function normalizeNotificationPrefs(prefs?: Partial<NotificationPrefs>): NotificationPrefs {
  return {
    ...defaultNotificationPrefs,
    ...prefs,
  };
}
