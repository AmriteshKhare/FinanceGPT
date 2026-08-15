import { describe, expect, it } from 'vitest';
import {
  CALCULATION_VERSION,
  MoneyError,
  assertPositivePaise,
  formatInr,
  rupeesToPaise,
} from './money.js';

describe('CALCULATION_VERSION', () => {
  it('is a semver string', () => {
    expect(CALCULATION_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('assertPositivePaise', () => {
  it('accepts positive integers', () => {
    expect(() => assertPositivePaise(1)).not.toThrow();
    expect(() => assertPositivePaise(500000)).not.toThrow();
  });

  it('rejects zero, negative, and non-integers', () => {
    expect(() => assertPositivePaise(0)).toThrow(MoneyError);
    expect(() => assertPositivePaise(-1)).toThrow(MoneyError);
    expect(() => assertPositivePaise(1.5)).toThrow(MoneyError);
  });
});

describe('formatInr', () => {
  it('formats paise with Indian grouping', () => {
    expect(formatInr(0)).toBe('₹0.00');
    expect(formatInr(1)).toBe('₹0.01');
    expect(formatInr(100)).toBe('₹1.00');
    expect(formatInr(500000)).toBe('₹5,000.00');
    expect(formatInr(40000000)).toBe('₹4,00,000.00');
  });

  it('rejects floats', () => {
    expect(() => formatInr(1.1)).toThrow(MoneyError);
  });
});

describe('rupeesToPaise', () => {
  it('converts whole rupees', () => {
    expect(rupeesToPaise(5)).toBe(500);
    expect(rupeesToPaise(400000)).toBe(40000000);
  });

  it('rejects fractional rupees', () => {
    expect(() => rupeesToPaise(1.5)).toThrow(MoneyError);
  });
});
