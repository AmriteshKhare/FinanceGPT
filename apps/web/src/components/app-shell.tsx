'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserPublic } from '@gpt-finance/shared';
import { fetchMe } from '@/lib/api';
import { AppNav } from '@/components/app-nav';

export function useRequireUser() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const me = await fetchMe();
      if (!me) {
        router.replace('/');
        return;
      }
      setUser(me);
      setLoading(false);
    })();
  }, [router]);

  return { user, loading };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireUser();

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse-soft text-sm font-semibold text-ink-700">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
      <AppNav householdName={user.householdName} email={user.email} />
      {children}
    </main>
  );
}
