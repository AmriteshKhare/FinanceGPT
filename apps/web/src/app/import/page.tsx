'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { AccountDto, CsvPreviewResponse } from '@gpt-finance/shared';
import { formatInr } from '@gpt-finance/finance-core';
import { confirmCsv, listAccounts, previewCsv } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function ImportBody() {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [accountId, setAccountId] = useState('');
  const [filename, setFilename] = useState('import.csv');
  const [csvText, setCsvText] = useState(
    'Date,Amount,Merchant,Category\n2026-08-01,500.00,Big Bazaar,groceries\n',
  );
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    occurredAt: 'Date',
    amount: 'Amount',
    merchant: 'Merchant',
    category: 'Category',
    type: '',
  });
  const [preview, setPreview] = useState<CsvPreviewResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const a = await listAccounts();
      setAccounts(a.filter((x) => !x.isArchived));
      if (a[0]) setAccountId(a.find((x) => !x.isArchived)?.id ?? '');
    })();
  }, []);

  function onFile(file: File | null) {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setCsvText(text);
      const first = text.split(/\r?\n/)[0] ?? '';
      const cols = first.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      setHeaders(cols);
      setMapping((m) => ({
        occurredAt: cols.find((c) => /date|occurred/i.test(c)) ?? cols[0] ?? m.occurredAt,
        amount: cols.find((c) => /amount|amt/i.test(c)) ?? cols[1] ?? m.amount,
        merchant: cols.find((c) => /merchant|narration|desc/i.test(c)) ?? m.merchant,
        category: cols.find((c) => /categor/i.test(c)) ?? m.category,
        type: cols.find((c) => /type/i.test(c)) ?? '',
      }));
    };
    reader.readAsText(file);
  }

  async function onPreview(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await previewCsv({
        filename,
        csvText,
        accountId,
        columnMapping: {
          occurredAt: mapping.occurredAt,
          amount: mapping.amount,
          merchant: mapping.merchant || undefined,
          category: mapping.category || undefined,
          type: mapping.type || undefined,
        },
      });
      setPreview(res);
      setHeaders(res.headers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    }
  }

  async function onConfirm() {
    if (!preview) return;
    setError(null);
    try {
      const res = await confirmCsv({ batchId: preview.batchId, skipDuplicates: true });
      setMessage(`Imported ${res.importedCount}, skipped ${res.skippedCount}`);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    }
  }

  const mapCols = headers.length > 0 ? headers : ['Date', 'Amount', 'Merchant', 'Category'];

  return (
    <div className="space-y-4 animate-rise">
      <Card>
        <h1 className="font-display text-2xl font-semibold">CSV import</h1>
        <p className="mt-1 text-sm text-ink-700">
          Preview, map columns, review duplicates, then confirm writes.
        </p>
        <form className="mt-4 space-y-3" onSubmit={onPreview}>
          <div>
            <label className="mb-1 block text-sm font-semibold">Account</label>
            <select
              className="flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Or paste CSV</label>
            <textarea
              className="min-h-32 w-full rounded-md border border-ink-200 bg-white/80 p-3 font-mono text-xs"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['occurredAt', 'Date column'],
                ['amount', 'Amount column'],
                ['merchant', 'Merchant column'],
                ['category', 'Category slug column'],
                ['type', 'Type column (optional)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-semibold">{label}</label>
                <select
                  className="flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 text-sm"
                  value={mapping[key]}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                >
                  {key === 'type' || key === 'merchant' || key === 'category' ? (
                    <option value="">—</option>
                  ) : null}
                  {mapCols.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {error ? (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm font-medium text-leaf-600">{message}</p> : null}
          <Button type="submit">Preview</Button>
        </form>
      </Card>

      {preview ? (
        <Card>
          <p className="text-sm text-ink-700">
            Valid {preview.validCount} · Duplicates {preview.duplicateCount} · Errors{' '}
            {preview.errorCount}
          </p>
          <div className="mt-3 max-h-80 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Amount</th>
                  <th className="py-2 pr-2">Merchant</th>
                  <th className="py-2 pr-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowIndex} className="border-b border-ink-100">
                    <td className="py-2 pr-2">{r.rowIndex + 1}</td>
                    <td className="py-2 pr-2">
                      {r.amountPaise != null ? formatInr(r.amountPaise) : '—'}
                    </td>
                    <td className="py-2 pr-2">{r.merchant || '—'}</td>
                    <td className="py-2 pr-2">
                      {r.isDuplicate ? 'duplicate ' : ''}
                      {r.errors.join('; ')}
                      {!r.isDuplicate && r.errors.length === 0 ? 'ok' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button className="mt-4" type="button" onClick={() => void onConfirm()}>
            Confirm import (skip duplicates)
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

export default function ImportPage() {
  return (
    <AppShell>
      <ImportBody />
    </AppShell>
  );
}
