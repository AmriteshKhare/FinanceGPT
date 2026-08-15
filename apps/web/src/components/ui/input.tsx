import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-ink-200 bg-white/80 px-3 py-2 text-sm text-ink-900 shadow-sm placeholder:text-ink-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
