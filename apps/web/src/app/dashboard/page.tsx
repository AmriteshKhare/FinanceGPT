'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TransactionDto } from '@gpt-finance/shared';
import { formatInr } from '@gpt-finance/finance-core';
import { listTransactions } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';

function DashboardBody() {
  const [recent, setRecent] = useState<TransactionDto[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const data = await listTransactions({ status: 'confirmed' });
        setRecent(data.transactions.slice(0, 5));
        setTotal(data.total);
      } catch {
        setRecent([]);
      }
    })();
  }, []);

  return (
    <section className="space-y-4 animate-rise">
      <Card>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Dashboard</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          Accounts and transactions are live. Charts, budgets, goals, and purchase evaluation arrive
          in later milestones. Money math stays in the deterministic finance engine.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/transactions"
            className="inline-flex h-11 items-center rounded-md bg-ink-900 px-5 text-sm font-semibold text-ink-50"
          >
            Add transaction
          </Link>
          <Link
            href="/accounts"
            className="inline-flex h-11 items-center rounded-md bg-sand-200 px-5 text-sm font-semibold text-ink-900"
          >
            Manage accounts
          </Link>
        </div>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-700">
          Financial pulse
        </h2>
        <p className="mt-2 text-base text-ink-900">
          {total === 0
            ? 'No confirmed transactions yet — add activity under Transactions or Import CSV.'
            : `${total} confirmed transaction${total === 1 ? '' : 's'} on record.`}
        </p>
        {recent.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {recent.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 border-t border-ink-100 pt-2 text-sm"
              >
                <span className="text-ink-800">
                  {tx.type} · {tx.merchant || '—'}
                </span>
                <span className="font-semibold tabular-nums">{formatInr(tx.amountPaise)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardBody />
    </AppShell>
  );
}
