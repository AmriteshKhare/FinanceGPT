'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserPublic } from '@gpt-finance/shared';
import { fetchMe } from '@/lib/api';
import { LoginForm } from '@/components/login-form';
import { LockScreen } from '@/components/lock-screen';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) {
          setUser(me);
          setLocked(Boolean(me));
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="animate-pulse-soft text-sm font-semibold text-ink-700">Loading Gpt Finance…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="relative flex min-h-screen flex-col justify-end px-4 pb-10 pt-16 sm:justify-center sm:pb-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-leaf-500/20 blur-3xl animate-pulse-soft" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-ink-800/10 blur-3xl" />
        </div>
        <div className="relative mx-auto w-full max-w-md animate-rise">
          <p className="font-display text-5xl font-bold tracking-tight text-ink-950 sm:text-6xl">
            Gpt Finance
          </p>
          <p className="mt-3 max-w-sm text-base text-ink-700">
            Local-first money decisions for your household — deterministic first, AI optional.
          </p>
          <div className="mt-8">
            <LoginForm
              onSuccess={(next) => {
                setUser(next);
                setLocked(true);
              }}
            />
          </div>
        </div>
      </main>
    );
  }

  if (locked) {
    return (
      <LockScreen
        userEmail={user.email}
        onUnlock={() => {
          setLocked(false);
          router.push('/dashboard');
        }}
      />
    );
  }

  return null;
}
