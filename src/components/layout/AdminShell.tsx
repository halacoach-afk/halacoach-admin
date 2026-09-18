import type {ReactNode} from 'react';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/current-user';
import {RouteGuard} from './RouteGuard';
import {Sidebar} from './Sidebar';
import {TopBar} from './TopBar';

export async function AdminShell({children}: {children: ReactNode}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar actor={user} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar name={user.name} email={user.email} role={user.role} />
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <RouteGuard actor={user}>{children}</RouteGuard>
        </main>
      </div>
    </div>
  );
}
