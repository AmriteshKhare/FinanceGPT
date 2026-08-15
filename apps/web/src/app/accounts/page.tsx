'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { AccountDto } from '@gpt-finance/shared';
import { formatInr } from '@gpt-finance/finance-core';
import { createAccount, listAccounts, patchAccount, rupeeInputToPaise } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const ACCOUNT_TYPES = [
  'cash',
  'bank',
  'credit_card',
  'wallet',
  'investment',
  'loan',
] as const;

function AccountsBody() {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]>('bank');
  const [opening, setOpening] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setAccounts(await listAccounts());
  }

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAccount({
        name,
        type,
        openingBalancePaise: rupeeInputToPaise(opening || '0'),
      });
      setName('');
      setOpening('0');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 animate-rise">
      <Card>
        <h1 className="font-display text-2xl font-semibold">Accounts</h1>
        <p className="mt-1 text-sm text-ink-700">Household cash, bank, cards, and wallets.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold" htmlFor="acct-name">
              Name
            </label>
            <Input
              id="acct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="HDFC Salary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="acct-type">
              Type
            </label>
            <select
              id="acct-type"
              className="flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as (typeof ACCOUNT_TYPES)[number])}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="acct-open">
              Opening balance (₹)
            </label>
            <Input
              id="acct-open"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {error ? (
            <p className="sm:col-span-2 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add account'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <ul className="divide-y divide-ink-100">
          {accounts.length === 0 ? (
            <li className="py-2 text-sm text-ink-700">No accounts yet.</li>
          ) : (
            accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink-900">
                    {a.name}{' '}
                    {a.isArchived ? (
                      <span className="text-xs font-medium text-ink-700">(archived)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-700">
                    {a.type} · opening {formatInr(a.openingBalancePaise)}
                  </p>
                </div>
                {!a.isArchived ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await patchAccount(a.id, { isArchived: true });
                      await refresh();
                    }}
                  >
                    Archive
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <AppShell>
      <AccountsBody />
    </AppShell>
  );
}
