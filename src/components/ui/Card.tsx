import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5', className)}>
      {children}
    </div>
  );
}
