'use client';

import {useRouter} from 'next/navigation';
import {LogOut} from 'lucide-react';
import type {AdminRole} from '@/api';
import {roleLabel} from '@/lib/helpers';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {clearSessionCookie} from '@/lib/session';

export function TopBar({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: AdminRole;
}) {
  const router = useRouter();

  const signOut = () => {
    clearSessionCookie();
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <p className="text-sm text-muted-foreground">The Right Coach. For YOU</p>
      <div className="flex items-center gap-3">
        <div className="text-end">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <Badge tone="primary">{roleLabel(role)}</Badge>
        <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
          <LogOut size={16} strokeWidth={1.8} />
          Sign out
        </Button>
      </div>
    </header>
  );
}
