import { assertPositivePaise, MoneyError } from './money.js';

/** Calendar day key in Asia/Kolkata (YYYY-MM-DD) for duplicate detection. */
export function occurredDayKey(isoOrDate: string | Date, timeZone = 'Asia/Kolkata'): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) {
    throw new MoneyError('Invalid occurred_at for day key');
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function normalizeMerchant(merchant: string | null | undefined): string {
  return (merchant ?? '').trim().toLowerCase();
}

/**
 * Stable duplicate fingerprint for CSV import / dedupe.
 * household + account + calendar day + amount_paise + normalized merchant.
 */
export function duplicateFingerprint(input: {
  householdId: string;
  accountId: string;
  occurredAt: string | Date;
  amountPaise: number;
  merchant?: string | null;
  timeZone?: string;
}): string {
  assertPositivePaise(input.amountPaise);
  const day = occurredDayKey(input.occurredAt, input.timeZone ?? 'Asia/Kolkata');
  return [
    input.householdId,
    input.accountId,
    day,
    String(input.amountPaise),
    normalizeMerchant(input.merchant),
  ].join('|');
}

export function assertTransferAccountsDiffer(fromAccountId: string, toAccountId: string): void {
  if (fromAccountId === toAccountId) {
    throw new MoneyError('Transfer source and destination accounts must differ');
  }
}

/**
 * Parse INR amount string from CSV into positive paise.
 * Accepts "1234.56", "1,234.56", "₹1,234.56", or integer paise with mode hint.
 */
export function parseInrAmountToPaise(raw: string): number {
  const cleaned = raw.replace(/₹/g, '').replace(/,/g, '').trim();
  if (!cleaned) {
    throw new MoneyError('Empty amount');
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new MoneyError(`Invalid amount: ${raw}`);
  }
  const negative = cleaned.startsWith('-');
  const abs = negative ? cleaned.slice(1) : cleaned;
  const [whole, frac = ''] = abs.split('.');
  const rupees = Number.parseInt(whole, 10);
  const paisePart = Number.parseInt(frac.padEnd(2, '0').slice(0, 2) || '0', 10);
  const paise = rupees * 100 + paisePart;
  if (paise === 0) {
    throw new MoneyError('Amount must be non-zero');
  }
  assertPositivePaise(paise);
  return negative ? -paise : paise;
}

/** Simple CSV line splitter supporting quoted fields. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}
