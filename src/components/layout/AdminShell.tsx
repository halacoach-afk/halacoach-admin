import type {ReactNode} from 'react';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/current-user';
import {AdminChrome} from './AdminChrome';
import {RouteGuard} from './RouteGuard';

export async function AdminShell({children}: {children: ReactNode}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <AdminChrome actor={user}>
      <RouteGuard actor={user}>{children}</RouteGuard>
    </AdminChrome>
  );
}
