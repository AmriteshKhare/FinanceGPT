import type { AuthMeResponse, LoginResponse, UserPublic } from '@gpt-finance/shared';

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  return data;
}

export async function login(email: string, password: string): Promise<UserPublic> {
  const res = await fetch('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'Login failed');
  }
  const body = await parseJson<LoginResponse>(res);
  return body.user;
}

export async function logout(): Promise<void> {
  await fetch('/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function fetchMe(): Promise<UserPublic | null> {
  const res = await fetch('/v1/auth/me', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error('Failed to load session');
  }
  const body = await parseJson<AuthMeResponse>(res);
  return body.user;
}
