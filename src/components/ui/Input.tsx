'use client';

import {useState, type InputHTMLAttributes} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {cn} from '@/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({label, error, className, id, type, ...props}: InputProps) {
  const inputId = id ?? props.name;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-foreground" htmlFor={inputId}>
      {label}
      <span className="relative mt-1.5 block">
        <input
          id={inputId}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          className={cn(
            'h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal outline-none focus:border-primary',
            isPassword && 'pe-11',
            error ? 'border-destructive' : 'border-border',
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-y-0 end-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible(v => !v)}>
            {visible ? (
              <EyeOff className="size-4" strokeWidth={1.8} />
            ) : (
              <Eye className="size-4" strokeWidth={1.8} />
            )}
          </button>
        ) : null}
      </span>
      {error ? (
        <span className="mt-1 block text-xs font-normal text-destructive">{error}</span>
      ) : null}
    </label>
  );
}
