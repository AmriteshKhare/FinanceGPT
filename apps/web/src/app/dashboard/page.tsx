'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserPublic } from '@gpt-finance/shared';
import { fetchMe, logout } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    void (async () => {
      const me = await fetchMe();
      if (!me) {
        router.replace('/');
        return;
      }
      setUser(me);
    })();
  }, [router]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse-soft text-sm font-semibold text-ink-700">Opening dashboard…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4 animate-rise">
        <div>
          <p className="font-display text-3xl font-bold text-ink-950">Gpt Finance</p>
          <p className="mt-1 text-sm text-ink-700">
            {user.householdName} · {user.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem('gf_app_unlocked');
              router.push('/');
            }}
          >
            Lock
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout();
              router.replace('/');
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <section className="space-y-4 animate-rise" style={{ animationDelay: '80ms' }}>
        <Card>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Dashboard</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Milestone 1 shell is ready. Charts, budgets, goals, and purchase evaluation arrive in
            later milestones. All money math will stay in the deterministic finance engine — never
            in the LLM.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-700">
            Financial pulse
          </h2>
          <p className="mt-2 text-base text-ink-900">
            No transactions yet — add accounts and activity in Milestone 2.
          </p>
        </Card>
      </section>
    </main>
  );
}
