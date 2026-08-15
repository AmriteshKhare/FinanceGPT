/** Semantic version of deterministic calculation/policy code. */
export const CALCULATION_VERSION = '1.0.0' as const;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/**
 * Asserts a non-negative integer paise amount.
 * All money in this system is stored as integer paise — never floats.
 */
export function assertNonNegativePaise(paise: number): asserts paise is number {
  if (!Number.isInteger(paise)) {
    throw new MoneyError('Amount must be an integer number of paise');
  }
  if (paise < 0) {
    throw new MoneyError('Amount must be non-negative paise');
  }
  if (!Number.isSafeInteger(paise)) {
    throw new MoneyError('Amount exceeds safe integer range');
  }
}

/**
 * Asserts a strictly positive integer paise amount.
 */
export function assertPositivePaise(paise: number): asserts paise is number {
  assertNonNegativePaise(paise);
  if (paise === 0) {
    throw new MoneyError('Amount must be positive paise');
  }
}

/**
 * Format integer paise as Indian Rupee display string (e.g. ₹1,234.56).
 * Uses en-IN grouping. Never accepts floats as input — paise only.
 */
export function formatInr(paise: number): string {
  assertNonNegativePaise(paise);
  const rupees = Math.trunc(paise / 100);
  const fraction = Math.abs(paise % 100);
  const fractionStr = fraction.toString().padStart(2, '0');
  const grouped = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rupees);
  return `₹${grouped}.${fractionStr}`;
}

/**
 * Convert whole rupees (integer or string digits) to paise.
 * Rejects fractional rupee inputs that would require float parsing.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isInteger(rupees)) {
    throw new MoneyError('Rupees must be an integer when converting to paise; use paise directly for subunits');
  }
  assertNonNegativePaise(rupees * 100);
  return rupees * 100;
}
