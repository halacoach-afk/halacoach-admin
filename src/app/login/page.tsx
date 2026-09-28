'use client';

import {FormEvent, useState} from 'react';
import {useRouter} from 'next/navigation';
import {LockKeyhole, ShieldCheck} from 'lucide-react';
import {isApiError, login} from '@/api';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {writeApiTokenCookie, writeSessionCookie} from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const {user, token} = await login(email, password);
      writeSessionCookie(user);
      if (token) {
        writeApiTokenCookie(token);
      }
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 10% 20%, rgba(15, 118, 110, 0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(110, 203, 245, 0.16), transparent 50%), linear-gradient(165deg, #f3f7f6 0%, #fafaf8 45%, #eef6f5 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15, 118, 110, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 118, 110, 0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-stretch lg:gap-0 lg:px-10 lg:py-16">
        <section className="login-brand flex flex-1 flex-col justify-center lg:pe-16">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
            <ShieldCheck className="size-7" strokeWidth={1.75} />
          </div>
          <p className="mt-8 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-6xl">
            HalaCoach
          </p>
          <h1 className="mt-3 max-w-md text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Admin console
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Review verification, support, and marketplace operations from one secure workspace.
          </p>
          <ul className="mt-8 hidden gap-3 text-sm text-muted-foreground sm:grid">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Verification & coach approvals
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Support inbox & platform settings
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Credits, leads, and access control
            </li>
          </ul>
        </section>

        <section className="login-card flex w-full flex-col justify-center lg:w-[26rem] lg:shrink-0">
          <div className="rounded-3xl border border-border/80 bg-card/95 p-8 shadow-[0_24px_60px_-28px_rgba(15,118,110,0.35)] backdrop-blur-sm sm:p-10">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <LockKeyhole className="size-5" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Sign in</h2>
              </div>
            </div>

            <form className="mt-8 space-y-5" onSubmit={e => void onSubmit(e)}>
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              {error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/20 bg-red-50 px-3.5 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
