'use client';

import {FormEvent, useState} from 'react';
import {useRouter} from 'next/navigation';
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
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-2xl font-bold text-primary">HalaCoach</p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Sign in to admin</h1>

        <form className="mt-8 space-y-4" onSubmit={e => void onSubmit(e)}>
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
            error={error ?? undefined}
            required
          />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
