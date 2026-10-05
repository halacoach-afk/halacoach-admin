'use client';

import {FormEvent, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {KeyRound, ShieldCheck} from 'lucide-react';
import {forgotPassword, isApiError, resendForgotPassword, resetPassword} from '@/api';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {isPasswordPolicyValid} from '@/lib/password-policy';
import {writeApiTokenCookie, writeSessionCookie} from '@/lib/session';

type Step = 'email' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await forgotPassword(email);
      setInfo(res.message || 'Please check your email for a verification code.');
      setStep('reset');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not send reset code.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await resendForgotPassword(email);
      setInfo(res.message || 'Please check your email for a verification code.');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not resend code.');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (!isPasswordPolicyValid(password)) {
      setError(
        'Password must be at least 8 characters and include upper, lower, number, and symbol.',
      );
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await resetPassword({
        email,
        code,
        password,
        passwordConfirmation,
      });
      if (!res.token || !res.user) {
        setError('Could not reset password.');
        return;
      }
      writeSessionCookie(res.user);
      writeApiTokenCookie(res.token);
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not reset password.');
    } finally {
      setBusy(false);
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

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-stretch lg:gap-0 lg:px-10 lg:py-16">
        <section className="login-brand flex flex-1 flex-col justify-center lg:pe-16">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
            <KeyRound className="size-7" strokeWidth={1.75} />
          </div>
          <p className="mt-8 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-6xl">
            HalaCoach
          </p>
          <h1 className="mt-3 max-w-md text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Reset admin password
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            We will email a one-time code to verify it is you, then you can choose a new password.
          </p>
        </section>

        <section className="login-card flex w-full flex-col justify-center lg:w-[26rem] lg:shrink-0">
          <div className="rounded-3xl border border-border/80 bg-card/95 p-8 shadow-[0_24px_60px_-28px_rgba(15,118,110,0.35)] backdrop-blur-sm sm:p-10">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <ShieldCheck className="size-5" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {step === 'email' ? 'Forgot password' : 'Enter code'}
                </h2>
              </div>
            </div>

            {step === 'email' ? (
              <form className="mt-8 space-y-5" onSubmit={e => void sendCode(e)}>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-red-50 px-3.5 py-2.5 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Sending...' : 'Send code'}
                </Button>
              </form>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={e => void submitReset(e)}>
                {info ? (
                  <p className="rounded-xl border border-primary/20 bg-primary-soft px-3.5 py-2.5 text-sm text-primary">
                    {info}
                  </p>
                ) : null}
                <Input
                  label="Verification code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
                <Input
                  label="New password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <Input
                  label="Confirm password"
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={e => setPasswordConfirmation(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use at least 8 characters with upper, lower, number, and symbol.
                </p>
                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-red-50 px-3.5 py-2.5 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Resetting...' : 'Reset password'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void resend()}>
                  {busy ? 'Resending...' : 'Resend code'}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
