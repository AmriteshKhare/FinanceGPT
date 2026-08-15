import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-ink-200/70 bg-white/70 p-6 shadow-sm backdrop-blur', className)}
      {...props}
    />
  );
}
