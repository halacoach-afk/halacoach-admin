'use client';

import {Search, X} from 'lucide-react';
import {cn} from '@/lib/cn';

export const SEARCH_PLACEHOLDER = 'Search…';

export function SearchField({
  value,
  onChange,
  placeholder = SEARCH_PLACEHOLDER,
  className,
  inputClassName,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  id?: string;
}) {
  const hasValue = value.trim().length > 0;

  return (
    <div
      className={cn(
        'relative ms-auto w-full min-w-[16rem] max-w-md flex-1 sm:max-w-sm sm:flex-none sm:w-80',
        className,
      )}>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.8}
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-label={placeholder}
        onChange={event => onChange(event.target.value)}
        className={cn(
          'h-10 w-full rounded-xl border border-border bg-card pe-10 ps-10 text-sm text-foreground outline-none transition',
          'placeholder:text-muted-foreground/80',
          'hover:border-foreground/20 focus:border-primary focus:ring-2 focus:ring-primary/15',
          'disabled:cursor-not-allowed disabled:opacity-60',
          '[&::-webkit-search-cancel-button]:appearance-none',
          inputClassName,
        )}
      />
      {hasValue ? (
        <button
          type="button"
          disabled={disabled}
          className="absolute end-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none"
          aria-label="Clear search"
          onClick={() => onChange('')}>
          <X className="size-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
