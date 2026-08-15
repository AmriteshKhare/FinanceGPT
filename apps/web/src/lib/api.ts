import type {
  AccountDto,
  AuthMeResponse,
  CategoryDto,
  CreateAccountRequest,
  CreateTransactionRequest,
  CreateTransferRequest,
  CsvConfirmResponse,
  CsvPreviewRequest,
  CsvPreviewResponse,
  LoginResponse,
  TransactionDto,
  UserPublic,
} from '@gpt-finance/shared';

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Request failed (${res.status})`);
  }
  return parseJson<T>(res);
}

export async function login(email: string, password: string): Promise<UserPublic> {
  const body = await api<LoginResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return body.user;
}

export async function logout(): Promise<void> {
  await api('/v1/auth/logout', { method: 'POST' });
}

export async function fetchMe(): Promise<UserPublic | null> {
  const res = await fetch('/v1/auth/me', { credentials: 'include', cache: 'no-store' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to load session');
  const body = await parseJson<AuthMeResponse>(res);
  return body.user;
}

export async function listAccounts(): Promise<AccountDto[]> {
  const body = await api<{ accounts: AccountDto[] }>('/v1/accounts');
  return body.accounts;
}

export async function createAccount(input: CreateAccountRequest): Promise<AccountDto> {
  const body = await api<{ account: AccountDto }>('/v1/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.account;
}

export async function patchAccount(
  id: string,
  input: { name?: string; isArchived?: boolean },
): Promise<AccountDto> {
  const body = await api<{ account: AccountDto }>(`/v1/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return body.account;
}

export async function listCategories(): Promise<CategoryDto[]> {
  const body = await api<{ categories: CategoryDto[] }>('/v1/categories');
  return body.categories;
}

export async function listTransactions(params?: {
  accountId?: string;
  categoryId?: string;
  status?: string;
  from?: string;
  to?: string;
}): Promise<{ transactions: TransactionDto[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set('accountId', params.accountId);
  if (params?.categoryId) qs.set('categoryId', params.categoryId);
  if (params?.status) qs.set('status', params.status);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const q = qs.toString();
  return api(`/v1/transactions${q ? `?${q}` : ''}`);
}

export async function createTransaction(input: CreateTransactionRequest): Promise<TransactionDto> {
  const body = await api<{ transaction: TransactionDto }>('/v1/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.transaction;
}

export async function createTransfer(input: CreateTransferRequest): Promise<TransactionDto[]> {
  const body = await api<{ transactions: TransactionDto[] }>('/v1/transfers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.transactions;
}

export async function voidTransaction(id: string, reason?: string): Promise<TransactionDto[]> {
  const body = await api<{ transactions: TransactionDto[] }>(`/v1/transactions/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return body.transactions;
}

export async function previewCsv(input: CsvPreviewRequest): Promise<CsvPreviewResponse> {
  return api('/v1/imports/csv/preview', { method: 'POST', body: JSON.stringify(input) });
}

export async function confirmCsv(input: {
  batchId: string;
  skipDuplicates?: boolean;
}): Promise<CsvConfirmResponse> {
  return api('/v1/imports/csv/confirm', { method: 'POST', body: JSON.stringify(input) });
}

/** Convert rupee decimal string like "1234.56" to paise. */
export function rupeeInputToPaise(value: string): number {
  const cleaned = value.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error('Enter a valid amount like 1234.56');
  }
  const [w, f = ''] = cleaned.split('.');
  return Number.parseInt(w, 10) * 100 + Number.parseInt(f.padEnd(2, '0').slice(0, 2) || '0', 10);
}
