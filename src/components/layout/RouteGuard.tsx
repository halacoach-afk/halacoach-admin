'use client';

import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import type {SessionUser} from '@/api/types';
import {can, permissionForPath} from '@/lib/permissions';
import {Forbidden} from './Forbidden';

export function RouteGuard({
  actor,
  children,
}: {
  actor: SessionUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const permission = permissionForPath(pathname);
  if (!can(actor, permission)) {
    return (
      <Forbidden body="Your role cannot open this page. Ask a super admin to update role permissions." />
    );
  }
  return children;
}
