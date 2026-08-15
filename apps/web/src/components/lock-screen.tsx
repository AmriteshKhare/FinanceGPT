'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const LOCK_KEY = 'gf_app_unlocked';

export function LockScreen({
  userEmail,
  onUnlock,
}: {
  userEmail: string;
  onUnlock: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Shared-network app lock stub: any 4+ digit PIN unlocks for this browser session.
    // A configurable household PIN arrives in a later milestone.
    if (pin.trim().length < 4) {
      setError('Enter at least 4 digits to unlock');
      return;
    }
    sessionStorage.setItem(LOCK_KEY, '1');
    setError(null);
    onUnlock();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm animate-rise space-y-6 text-center">
        <div>
          <p className="font-display text-4xl font-bold text-ink-950">Gpt Finance</p>
          <p className="mt-2 text-sm text-ink-700">App locked · {userEmail}</p>
        </div>
        <Card>
          <form className="space-y-4 text-left" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="pin">
                Unlock PIN
              </label>
              <Input
                id="pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-xs text-ink-700">
                Protects the open session on a shared local network device.
              </p>
            )}
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
