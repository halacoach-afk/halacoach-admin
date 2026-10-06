'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {LogOut} from 'lucide-react';
import {getNavBadges, type NavBadges, type SessionUser} from '@/api';
import {cn} from '@/lib/cn';
import {roleLabel} from '@/lib/helpers';
import {navItems} from '@/lib/nav';
import {can} from '@/lib/permissions';
import {clearSessionCookie} from '@/lib/session';

function formatBadgeCount(value: number) {
  if (value <= 0) return null;
  return value > 99 ? '99+' : String(value);
}

export function Sidebar({actor}: {actor: SessionUser}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = useMemo(
    () => navItems.filter(item => can(actor, item.permission)),
    [actor],
  );
  const needsBadges = useMemo(
    () => items.some(item => item.badgeKey != null),
    [items],
  );
  const [badges, setBadges] = useState<NavBadges | null>(null);

  const loadBadges = useCallback(async () => {
    if (!needsBadges) {
      setBadges(null);
      return;
    }
    try {
      const next = await getNavBadges();
      setBadges(next);
    } catch {
      // Keep last known counts; sidebar should stay usable if this endpoint fails.
    }
  }, [needsBadges]);

  useEffect(() => {
    void loadBadges();
  }, [loadBadges, pathname]);

  useEffect(() => {
    const onFocus = () => {
      void loadBadges();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadBadges]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-e border-border bg-card">
      <div className="border-b border-border px-5 py-5">
        <Link href="/" className="inline-flex" aria-label="HalaCoach admin home">
          <img
            src="/logo.png"
            alt="HalaCoach"
            width={158}
            height={36}
            className="h-9 w-auto max-w-full"
          />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map(item => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) ||
                (item.href === '/billing' && pathname.startsWith('/subscriptions'));
          const Icon = item.icon;
          const count = item.badgeKey && badges ? badges[item.badgeKey] : 0;
          const badgeLabel = formatBadgeCount(count);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-primary-soft text-primary-deep'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}>
              <Icon size={18} strokeWidth={1.7} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badgeLabel ? (
                <span
                  className={cn(
                    'inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white',
                    active ? 'bg-primary' : 'bg-coral',
                  )}
                  aria-label={`${badgeLabel} awaiting action`}>
                  {badgeLabel}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div
          className="flex items-center gap-2.5 rounded-2xl bg-muted/70 px-3 py-2"
          title={actor.email}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{actor.name}</p>
            <p className="truncate text-[11px] font-medium leading-tight text-muted-foreground">{actor.email}</p>
            <p className="truncate text-[11px] font-medium leading-tight text-muted-foreground">
              {roleLabel(actor.role)}
            </p>
          </div>
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-card hover:text-destructive"
            onClick={() => {
              clearSessionCookie();
              router.replace('/login');
              router.refresh();
            }}
            aria-label="Sign out"
            title="Sign out">
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );
}
