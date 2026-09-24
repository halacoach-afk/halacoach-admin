import type {NotificationPrefs} from '@/api/types';

export const defaultNotificationPrefs: NotificationPrefs = {
  push: true,
  email: true,
  sms: true,
  whatsapp: true,
};

export const notificationPrefLabels: {key: keyof NotificationPrefs; label: string; hint: string}[] = [
  {key: 'push', label: 'Push notifications', hint: 'New matches, replies and reminders'},
  {key: 'email', label: 'Email notifications', hint: 'New matches, replies and reminders'},
  {key: 'sms', label: 'SMS notifications', hint: 'New matches, replies and reminders'},
  {key: 'whatsapp', label: 'WhatsApp notifications', hint: 'New matches, replies and reminders'},
];

export function normalizeNotificationPrefs(prefs?: Partial<NotificationPrefs>): NotificationPrefs {
  return {
    push: prefs?.push ?? defaultNotificationPrefs.push,
    email: prefs?.email ?? defaultNotificationPrefs.email,
    sms: prefs?.sms ?? defaultNotificationPrefs.sms,
    whatsapp: prefs?.whatsapp ?? defaultNotificationPrefs.whatsapp,
  };
}
