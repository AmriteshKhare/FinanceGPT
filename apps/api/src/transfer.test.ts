import { describe, expect, it } from 'vitest';
import { assertTransferAccountsDiffer, MoneyError } from '@gpt-finance/finance-core';

describe('transfer pairing rules', () => {
  it('rejects identical accounts', () => {
    expect(() => assertTransferAccountsDiffer('a', 'a')).toThrow(MoneyError);
  });

  it('allows distinct accounts', () => {
    expect(() => assertTransferAccountsDiffer('a', 'b')).not.toThrow();
  });
});
