'use client';

import Link from 'next/link';
import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Bell} from 'lucide-react';
import {
  isApiError,
  listAdminNotifications,
  markAdminNotificationRead,
  type AdminNotification,
} from '@/api';
import {cn} from '@/lib/cn';

const POLL_MS = 60_000;

function formatWhen(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function notificationHref(n: AdminNotification): string {
  const href = n.data && typeof n.data.href === 'string' ? n.data.href : '/';
  return href.startsWith('/') ? href : `/${href}`;
}

function showBrowserPush(n: AdminNotification) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const note = new Notification(n.title, {
      body: n.body,
      tag: `admin-notif-${n.id}`,
    });
    note.onclick = () => {
      window.focus();
      note.close();
    };
  } catch {
    // Ignore browser Notification failures (denied / unsupported).
  }
}

export function NotificationBell() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<number> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async (opts?: {silent?: boolean}) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await listAdminNotifications();
      const next = res.notifications ?? [];
      const prevKnown = knownIdsRef.current;
      if (prevKnown) {
        for (const n of next) {
          if (!n.read && !prevKnown.has(n.id)) {
            showBrowserPush(n);
          }
        }
      }
      knownIdsRef.current = new Set(next.map(n => n.id));
      setItems(next);
      setUnreadCount(res.unreadCount ?? next.filter(n => !n.read).length);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load({silent: true}), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const ensureBrowserPermission = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  };

  const onToggle = () => {
    ensureBrowserPermission();
    setOpen(prev => !prev);
  };

  const onMarkAll = async () => {
    try {
      const res = await markAdminNotificationRead('all');
      setItems(res.notifications ?? []);
      setUnreadCount(0);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not mark notifications read.');
    }
  };

  const onOpenItem = async (n: AdminNotification) => {
    setOpen(false);
    if (!n.read) {
      try {
        const res = await markAdminNotificationRead(n.id);
        if (res.notification) {
          setItems(prev =>
            prev.map(row => (row.id === n.id ? {...row, read: true} : row)),
          );
        } else if (res.notifications) {
          setItems(res.notifications);
        }
        setUnreadCount(res.unreadCount ?? Math.max(0, unreadCount - 1));
      } catch {
        // Navigation still proceeds.
      }
    }
  };

  return (
    <div ref={rootRef} className="relative ms-auto">
      <button
        type="button"
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-foreground hover:bg-muted"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}>
        <Bell size={20} strokeWidth={1.8} />
        {unreadCount > 0 ? (
          <span className="absolute end-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-4 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute end-0 top-[calc(100%+0.5rem)] z-50 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => void onMarkAll()}>
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : error ? (
              <div className="space-y-2 px-3 py-4 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => void load()}>
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map(n => (
                  <li key={n.id}>
                    <Link
                      href={notificationHref(n)}
                      className={cn(
                        'block px-3 py-3 transition-colors hover:bg-muted',
                        !n.read && 'bg-primary/5',
                      )}
                      onClick={() => void onOpenItem(n)}>
                      <div className="flex items-start gap-2">
                        {!n.read ? (
                          <span
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral"
                            aria-hidden
                          />
                        ) : (
                          <span className="mt-1.5 size-1.5 shrink-0" aria-hidden />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                            {n.body}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatWhen(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
