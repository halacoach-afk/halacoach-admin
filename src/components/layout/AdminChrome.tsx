'use client';

import {useEffect, useState, type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Menu, X} from 'lucide-react';
import type {SessionUser} from '@/api';
import {cn} from '@/lib/cn';
import {Sidebar} from './Sidebar';

export function AdminChrome({actor, children}: {actor: SessionUser; children: ReactNode}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 lg:px-5">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-xl text-foreground hover:bg-muted lg:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
        </button>
        <Link href="/" className="inline-flex min-w-0" aria-label="HalaCoach admin home">
          <img
            src="/logo.png"
            alt="HalaCoach"
            width={158}
            height={36}
            className="h-8 w-auto max-w-[11rem] lg:h-9 lg:max-w-none"
          />
        </Link>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1">
        {menuOpen ? (
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 top-14 z-40 bg-overlay lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <Sidebar
          actor={actor}
          className={cn(
            'z-50 w-64 max-w-[85vw] overflow-hidden border-e border-border bg-card',
            menuOpen ? 'fixed bottom-0 start-0 top-14 flex' : 'hidden',
            'lg:static lg:flex lg:h-full lg:max-w-none',
          )}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
