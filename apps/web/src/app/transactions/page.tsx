'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AccountDto, CategoryDto, TransactionDto } from '@gpt-finance/shared';
import { formatInr } from '@gpt-finance/finance-core';
import {
  createTransaction,
  createTransfer,
  listAccounts,
  listCategories,
  listTransactions,
  rupeeInputToPaise,
  voidTransaction,
} from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function TransactionsBody() {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [txs, setTxs] = useState<TransactionDto[]>([]);
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('confirmed');
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'txn' | 'transfer'>('txn');
  const [type, setType] = useState<'income' | 'expense' | 'refund' | 'adjustment'>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.isArchived), [accounts]);

  async function refresh() {
    const [a, c, t] = await Promise.all([
      listAccounts(),
      listCategories(),
      listTransactions({
        accountId: filterAccount || undefined,
        categoryId: filterCategory || undefined,
        status: filterStatus || undefined,
      }),
    ]);
    setAccounts(a);
    setCategories(c);
    setTxs(t.transactions);
    if (!accountId && a[0]) setAccountId(a.find((x) => !x.isArchived)?.id ?? '');
    if (!fromAccountId && a[0]) setFromAccountId(a.find((x) => !x.isArchived)?.id ?? '');
  }

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAccount, filterCategory, filterStatus]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const iso = new Date(occurredAt).toISOString();
      const paise = rupeeInputToPaise(amount);
      if (mode === 'transfer') {
        await createTransfer({
          fromAccountId,
          toAccountId,
          amountPaise: paise,
          occurredAt: iso,
          note: note || null,
        });
      } else {
        await createTransaction({
          accountId,
          type,
          amountPaise: paise,
          occurredAt: iso,
          categoryId: categoryId || null,
          merchant: merchant || null,
          note: note || null,
        });
      }
      setAmount('');
      setMerchant('');
      setNote('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div className="space-y-4 animate-rise">
      <Card>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === 'txn' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setMode('txn')}
          >
            Income / expense
          </Button>
          <Button
            type="button"
            variant={mode === 'transfer' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setMode('transfer')}
          >
            Transfer
          </Button>
        </div>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          {mode === 'txn' ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold">Type</label>
                <select
                  className="flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                >
                  <option value="expense">expense</option>
                  <option value="income">income</option>
                  <option value="refund">refund</option>
                  <option value="adjustment">adjustment</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Account</label>
                <select
                  className="flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Category</label>
                <select
                  className="flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Merchant</label>
                <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold">From</label>
                <select
                  className="flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                >
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">To</label>
                <select
                  className="flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                >
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold">Amount (₹)</label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">When</label>
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Note</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error ? (
            <p className="sm:col-span-2 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-semibold">History</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select
            className="h-11 rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="confirmed">confirmed</option>
            <option value="pending">pending</option>
            <option value="void">void</option>
          </select>
        </div>
        <ul className="mt-4 divide-y divide-ink-100">
          {txs.length === 0 ? (
            <li className="py-2 text-sm text-ink-700">No transactions match.</li>
          ) : (
            txs.map((tx) => (
              <li key={tx.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">
                    {tx.type} · {formatInr(tx.amountPaise)}
                    {tx.status === 'void' ? (
                      <span className="ml-2 text-xs font-medium text-ink-700">void</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-700">
                    {new Date(tx.occurredAt).toLocaleString('en-IN')} · {tx.merchant || '—'}
                  </p>
                </div>
                {tx.status !== 'void' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('Void this transaction?')) return;
                      await voidTransaction(tx.id, 'Voided from UI');
                      await refresh();
                    }}
                  >
                    Void
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

export default function TransactionsPage() {
  return (
    <AppShell>
      <TransactionsBody />
    </AppShell>
  );
}
