'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/import', label: 'Import' },
];

export function AppNav({
  householdName,
  email,
}: {
  householdName: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="mb-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="font-display text-3xl font-bold text-ink-950">
            Gpt Finance
          </Link>
          <p className="mt-1 text-sm text-ink-700">
            {householdName} · {email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem('gf_app_unlocked');
              router.push('/');
            }}
          >
            Lock
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout();
              router.replace('/');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-ink-200/80 pb-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-semibold transition',
              pathname === link.href
                ? 'bg-ink-900 text-ink-50'
                : 'bg-sand-200 text-ink-800 hover:bg-sand-100',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
