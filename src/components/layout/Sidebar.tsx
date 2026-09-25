'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {getNavBadges, type NavBadges, type SessionUser} from '@/api';
import {cn} from '@/lib/cn';
import {navItems} from '@/lib/nav';
import {can} from '@/lib/permissions';

function formatBadgeCount(value: number) {
  if (value <= 0) return null;
  return value > 99 ? '99+' : String(value);
}

export function Sidebar({actor}: {actor: SessionUser}) {
  const pathname = usePathname();
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
        <p className="text-lg font-bold tracking-tight text-primary">HalaCoach</p>
        <p className="text-xs font-medium text-muted-foreground">Admin console</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map(item => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
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
    </aside>
  );
}
