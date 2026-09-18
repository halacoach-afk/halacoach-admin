'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {SessionUser} from '@/api/types';
import {cn} from '@/lib/cn';
import {navItems} from '@/lib/nav';
import {can} from '@/lib/permissions';

export function Sidebar({actor}: {actor: SessionUser}) {
  const pathname = usePathname();
  const items = navItems.filter(item => can(actor, item.permission));

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
              <Icon size={18} strokeWidth={1.7} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-xs text-muted-foreground">Connected to live API</p>
    </aside>
  );
}
