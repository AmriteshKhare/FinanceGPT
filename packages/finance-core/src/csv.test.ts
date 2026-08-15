import { describe, expect, it } from 'vitest';
import {
  assertTransferAccountsDiffer,
  duplicateFingerprint,
  MoneyError,
  parseCsv,
  parseInrAmountToPaise,
} from './index.js';

describe('duplicateFingerprint', () => {
  it('is stable for same day merchant amount', () => {
    const a = duplicateFingerprint({
      householdId: 'h1',
      accountId: 'a1',
      occurredAt: '2026-08-15T10:00:00+05:30',
      amountPaise: 50000,
      merchant: '  Big Bazaar ',
    });
    const b = duplicateFingerprint({
      householdId: 'h1',
      accountId: 'a1',
      occurredAt: '2026-08-15T23:00:00+05:30',
      amountPaise: 50000,
      merchant: 'big bazaar',
    });
    expect(a).toBe(b);
  });
});

describe('parseInrAmountToPaise', () => {
  it('parses Indian formatted amounts', () => {
    expect(parseInrAmountToPaise('₹1,234.56')).toBe(123456);
    expect(parseInrAmountToPaise('100')).toBe(10000);
  });

  it('rejects empty', () => {
    expect(() => parseInrAmountToPaise('')).toThrow(MoneyError);
  });
});

describe('assertTransferAccountsDiffer', () => {
  it('rejects same account', () => {
    expect(() => assertTransferAccountsDiffer('a', 'a')).toThrow(MoneyError);
  });
});

describe('parseCsv', () => {
  it('parses headers and quoted fields', () => {
    const { headers, rows } = parseCsv('Date,Amount,Merchant\n2026-08-01,"1,200.00","Foo, Bar"\n');
    expect(headers).toEqual(['Date', 'Amount', 'Merchant']);
    expect(rows[0]).toEqual(['2026-08-01', '1,200.00', 'Foo, Bar']);
  });
});
