'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FileStack } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button, ErrorBanner, Input, Label } from '@/components/ui';
import type { AuthTokens } from '@/lib/types';

type Mode = 'signin' | 'register' | 'verify' | 'forgot' | 'reset';

interface CodeResponse {
  message: string;
  email?: string;
  delivered: boolean;
  devCode?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, setSession } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');

  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingDevCode, setPendingDevCode] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setSubmitting(false);
  }

  async function handleSignin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<CodeResponse>('/auth/register', {
        email,
        name,
        password,
      });
      setPendingEmail(email);
      setPendingDevCode(result.devCode ?? null);
      setInfo(result.message);
      setMode('verify');
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tokens = await api.post<AuthTokens>('/auth/verify-email', {
        email: pendingEmail,
        code,
      });
      setSession(tokens);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setSubmitting(false);
    }
  }

  async function handleForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<CodeResponse>('/auth/forgot-password', {
        email,
      });
      setPendingEmail(email);
      setPendingDevCode(result.devCode ?? null);
      setInfo(result.message);
      setMode('reset');
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<CodeResponse>('/auth/reset-password', {
        email: pendingEmail,
        code,
        newPassword,
      });
      setInfo(result.message);
      setPendingDevCode(null);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCode('');
      setMode('signin');
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
      setSubmitting(false);
    }
  }

  const subtitle = {
    signin: 'Sign in to access your documents',
    register: 'Enter your details to get started',
    verify: `Enter the 6-digit code sent to ${pendingEmail}`,
    forgot: 'We will email you a code to reset your password',
    reset: `Enter the code sent to ${pendingEmail} and choose a new password`,
  }[mode];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <FileStack className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">
              CA Firm Document Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {info && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {info}
            </div>
          )}
          {error && (
            <div className="mb-4">
              <ErrorBanner message={error} />
            </div>
          )}
          {pendingDevCode && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Development mode: your code is <b>{pendingDevCode}</b>
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignin} className="space-y-4">
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Button type="submit" className="w-full" loading={submitting}>
                Sign in
              </Button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Full name">
                <Input
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </Field>
              <Field label="Confirm password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Button type="submit" className="w-full" loading={submitting}>
                Create account
              </Button>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <Field label="Verification code">
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                />
              </Field>
              <Button type="submit" className="w-full" loading={submitting}>
                Verify and continue
              </Button>
              <p className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-indigo-600 hover:underline"
                >
                  Use a different email
                </button>
              </p>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Button type="submit" className="w-full" loading={submitting}>
                Send reset code
              </Button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <Field label="Reset code">
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                />
              </Field>
              <Field label="New password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </Field>
              <Field label="Confirm new password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Button type="submit" className="w-full" loading={submitting}>
                Reset password
              </Button>
            </form>
          )}

          <div className="mt-5 space-y-1 border-t border-gray-100 pt-4 text-center">
            {mode === 'signin' && (
              <>
                <LinkButton onClick={() => switchMode('register')}>
                  New here? Create an account
                </LinkButton>
                <LinkButton onClick={() => switchMode('forgot')}>
                  Forgot your password?
                </LinkButton>
              </>
            )}
            {mode === 'register' && (
              <LinkButton onClick={() => switchMode('signin')}>
                Already have an account? Sign in
              </LinkButton>
            )}
            {mode === 'forgot' && (
              <LinkButton onClick={() => switchMode('signin')}>
                Back to sign in
              </LinkButton>
            )}
            {mode === 'reset' && (
              <LinkButton onClick={() => switchMode('signin')}>
                Back to sign in
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LinkButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <p>
      <button
        type="button"
        onClick={onClick}
        className="text-sm text-indigo-600 hover:underline"
      >
        {children}
      </button>
    </p>
  );
}
